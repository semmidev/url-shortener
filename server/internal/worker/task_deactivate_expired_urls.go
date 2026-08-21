package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

const TaskDeactivateExpiredURLs = "task:deactivate_expired_urls"

type PayloadDeactivateExpiredURLs struct {
	BatchSize int32 `json:"batch_size"`
}

func (distributor *RedisTaskDistributor) DistributeTaskDeactivateExpiredURLs(
	ctx context.Context,
	payload *PayloadDeactivateExpiredURLs,
	opts ...asynq.Option,
) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	opts = append([]asynq.Option{asynq.Unique(1 * time.Minute)}, opts...)
	task := asynq.NewTask(TaskDeactivateExpiredURLs, jsonPayload, opts...)
	info, err := distributor.client.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	if distributor.logger != nil {
		distributor.logger.Info(ctx, "enqueued asynq task",
			"task_type", task.Type(),
			"queue", info.Queue,
			"batch_size", payload.BatchSize,
		)
	}
	return nil
}

func (processor *RedisTaskProcessor) ProcessTaskDeactivateExpiredURLs(ctx context.Context, task *asynq.Task) error {
	var payload PayloadDeactivateExpiredURLs
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", asynq.SkipRetry)
	}

	expiredCodes, err := processor.store.DeactivateExpiredURLs(ctx)
	if err != nil {
		return fmt.Errorf("failed to deactivate expired short URLs in worker: %w", err)
	}

	if len(expiredCodes) > 0 {
		cacheKeys := make([]string, len(expiredCodes))
		for i, code := range expiredCodes {
			cacheKeys[i] = fmt.Sprintf("url:code:%s", code)
		}
		if processor.cache != nil {
			_ = processor.cache.Delete(ctx, cacheKeys...)
		}
		processor.logger.Info(ctx, "background worker deactivated expired short URLs",
			"count", len(expiredCodes),
		)
	}

	return nil
}
