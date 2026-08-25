package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"uuid"

	"github.com/hibiken/asynq"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

const TaskRecordClickAnalytics = "task:record_click_analytics"

type PayloadRecordClickAnalytics struct {
	URLID     uuid.UUID `json:"url_id"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	Referrer  string    `json:"referrer"`
}

func (distributor *RedisTaskDistributor) DistributeTaskRecordClickAnalytics(
	ctx context.Context,
	payload *PayloadRecordClickAnalytics,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	task := asynq.NewTask(TaskRecordClickAnalytics, jsonPayload, opts...)
	_, err = distributor.client.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}
	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskRecordClickAnalytics(ctx context.Context, task *asynq.Task) error {
	var payload PayloadRecordClickAnalytics
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", asynq.SkipRetry)
	}

	if err := processor.store.IncrementClickCount(ctx, payload.URLID); err != nil {
		return fmt.Errorf("failed to increment click count in worker: %w", err)
	}

	_, err := processor.store.RecordClick(ctx, db.RecordClickParams{
		UrlID:     payload.URLID,
		IpAddress: payload.IP,
		UserAgent: payload.UserAgent,
		Referrer:  payload.Referrer,
	})
	if err != nil {
		return fmt.Errorf("failed to record click analytics in worker: %w", err)
	}

	return nil
}
