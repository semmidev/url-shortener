package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

const TaskRecordAuditLog = "task:record_audit_log"

type PayloadRecordAuditLog struct {
	ActorID    pgtype.UUID     `json:"actor_id"`
	ActorEmail string          `json:"actor_email"`
	Action     string          `json:"action"`
	Resource   string          `json:"resource"`
	ResourceID string          `json:"resource_id"`
	Payload    json.RawMessage `json:"payload"`
	IPAddress  string          `json:"ip_address"`
	UserAgent  string          `json:"user_agent"`
}

func (distributor *RedisTaskDistributor) DistributeTaskRecordAuditLog(
	ctx context.Context,
	payload *PayloadRecordAuditLog,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	task := asynq.NewTask(TaskRecordAuditLog, jsonPayload, opts...)
	_, err = distributor.client.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}
	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRecordAuditLog(ctx context.Context, task *asynq.Task) error {
	var payload PayloadRecordAuditLog
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", asynq.SkipRetry)
	}

	_, err := processor.store.CreateAuditLog(ctx, db.CreateAuditLogParams{
		ActorID:    payload.ActorID,
		ActorEmail: payload.ActorEmail,
		Action:     payload.Action,
		Resource:   payload.Resource,
		ResourceID: payload.ResourceID,
		Payload:    string(payload.Payload),
		IpAddress:  payload.IPAddress,
		UserAgent:  payload.UserAgent,
	})
	if err != nil {
		return fmt.Errorf("failed to create audit log in worker: %w", err)
	}

	return nil
}
