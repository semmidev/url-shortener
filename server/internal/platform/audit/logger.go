package audit

import (
	"context"
	"encoding/json"
	"net/http"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Logger struct {
	queries db.Querier
}

func NewLogger(queries db.Querier) *Logger {
	return &Logger{queries: queries}
}

type AuditParams struct {
	Action     string
	Resource   string
	ResourceID string
	Payload    any
}

func (l *Logger) Log(ctx context.Context, r *http.Request, params AuditParams) {
	if l == nil || l.queries == nil {
		return
	}

	userID, _ := web.UserID(ctx)
	actorEmail := "system"

	// Fetch actor email if userID is set
	if userID != uuid.Nil() {
		if u, err := l.queries.GetUserByID(ctx, userID); err == nil {
			actorEmail = u.Email
		}
	}

	var payloadBytes json.RawMessage
	if params.Payload != nil {
		if b, err := json.Marshal(params.Payload); err == nil {
			payloadBytes = b
		}
	}

	ipAddr := ""
	userAgent := ""
	if r != nil {
		ipAddr = r.RemoteAddr
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			ipAddr = xff
		}
		userAgent = r.UserAgent()
	}

	var actorUUID pgtype.UUID
	if userID != uuid.Nil() {
		actorUUID = pgtype.UUID{Bytes: userID, Valid: true}
	}

	go func() { //nolint:gosec // async audit log insertion requires detached background context
		bgCtx := context.WithoutCancel(ctx)
		_, _ = l.queries.CreateAuditLog(bgCtx, db.CreateAuditLogParams{
			ActorID:    actorUUID,
			ActorEmail: actorEmail,
			Action:     params.Action,
			Resource:   params.Resource,
			ResourceID: params.ResourceID,
			Payload:    payloadBytes,
			IpAddress:  ipAddr,
			UserAgent:  userAgent,
		})
	}()
}
