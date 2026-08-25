package audit

import (
	"context"
	"encoding/json"
	"net/http"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/worker"
)

type Logger struct {
	queries         db.Querier
	taskDistributor worker.TaskDistributor
	auditQueue      chan db.CreateAuditLogParams
}

func NewLogger(queries db.Querier) *Logger {
	l := &Logger{
		queries:    queries,
		auditQueue: make(chan db.CreateAuditLogParams, 10000),
	}
	// Start fixed worker pool for fallback async audit log processing (no unbounded goroutines)
	for i := 0; i < 3; i++ {
		go l.startFallbackWorker()
	}
	return l
}

func (l *Logger) SetTaskDistributor(distributor worker.TaskDistributor) {
	if l != nil {
		l.taskDistributor = distributor
	}
}

func (l *Logger) startFallbackWorker() {
	for params := range l.auditQueue {
		bgCtx := context.Background()
		_, _ = l.queries.CreateAuditLog(bgCtx, params)
	}
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
		ipAddr = web.GetClientIP(r)
		userAgent = r.UserAgent()
	}

	var actorUUID pgtype.UUID
	if userID != uuid.Nil() {
		actorUUID = pgtype.UUID{Bytes: userID, Valid: true}
	}

	if l.taskDistributor != nil {
		_ = l.taskDistributor.DistributeTaskRecordAuditLog(ctx, &worker.PayloadRecordAuditLog{
			ActorID:    actorUUID,
			ActorEmail: actorEmail,
			Action:     params.Action,
			Resource:   params.Resource,
			ResourceID: params.ResourceID,
			Payload:    payloadBytes,
			IPAddress:  ipAddr,
			UserAgent:  userAgent,
		})
		return
	}

	// Bounded non-blocking fallback enqueue (prevents spawning unbounded goroutines under high load)
	select {
	case l.auditQueue <- db.CreateAuditLogParams{
		ActorID:    actorUUID,
		ActorEmail: actorEmail,
		Action:     params.Action,
		Resource:   params.Resource,
		ResourceID: params.ResourceID,
		Payload:    payloadBytes,
		IpAddress:  ipAddr,
		UserAgent:  userAgent,
	}:
	default:
		// Queue full under extreme traffic
	}
}
