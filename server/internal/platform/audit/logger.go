package audit

import (
	"context"
	"encoding/json"
	"net/http"
	"uuid"

	"github.com/destel/rill"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/worker"
)

type Logger struct {
	queries         db.Querier
	taskDistributor worker.TaskDistributor
	auditQueue      chan db.CreateAuditLogParams
}

func NewLogger(q db.Querier, distributor worker.TaskDistributor) *Logger {
	l := &Logger{
		queries:         q,
		taskDistributor: distributor,
		auditQueue:      make(chan db.CreateAuditLogParams, 100),
	}
	l.startBackgroundWorker()
	return l
}

func (l *Logger) startBackgroundWorker() {
	go func() {
		_ = rill.ForEach(rill.FromChan(l.auditQueue, nil), 4, func(params db.CreateAuditLogParams) error {
			ctx := context.Background()
			_, _ = l.queries.CreateAuditLog(ctx, params)
			return nil
		})
	}()
}

type Params struct {
	Action     string
	Resource   string
	ResourceID string
	Payload    interface{}
}

func (l *Logger) Log(ctx context.Context, r *http.Request, params Params) {
	if l == nil {
		return
	}

	actorEmail := "system"
	var actorID *uuid.UUID
	if id, ok := web.UserID(ctx); ok && id != uuid.Nil() {
		actorID = &id
	}

	var payloadBytes []byte
	if params.Payload != nil {
		payloadBytes, _ = json.Marshal(params.Payload)
	}

	ipAddr := ""
	userAgent := ""
	if r != nil {
		ipAddr = web.GetClientIP(r)
		userAgent = r.UserAgent()
	}
	if l.taskDistributor != nil {
		err := l.taskDistributor.DistributeTaskRecordAuditLog(ctx, &worker.PayloadRecordAuditLog{
			ActorID:    actorID,
			ActorEmail: actorEmail,
			Action:     params.Action,
			Resource:   params.Resource,
			ResourceID: params.ResourceID,
			Payload:    payloadBytes,
			IPAddress:  ipAddr,
			UserAgent:  userAgent,
		})
		if err == nil {
			return
		}
	}

	// Bounded non-blocking fallback enqueue (prevents spawning unbounded goroutines under high load)
	select {
	case l.auditQueue <- db.CreateAuditLogParams{
		ActorID:    actorID,
		ActorEmail: actorEmail,
		Action:     params.Action,
		Resource:   params.Resource,
		ResourceID: params.ResourceID,
		Payload:    string(payloadBytes),
		IpAddress:  ipAddr,
		UserAgent:  userAgent,
	}:
	default:
		// Queue full under extreme traffic
	}
}
