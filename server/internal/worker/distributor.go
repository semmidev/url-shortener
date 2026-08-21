package worker

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

// TaskDistributor defines the contract for enqueuing asynchronous tasks.
type TaskDistributor interface {
	DistributeTaskDeactivateExpiredURLs(
		ctx context.Context,
		payload *PayloadDeactivateExpiredURLs,
		opts ...asynq.Option,
	) error
}

// RedisTaskDistributor is a Redis-backed implementation of TaskDistributor using Asynq.
type RedisTaskDistributor struct {
	client *asynq.Client
	logger *logger.Logger
}

// NewRedisTaskDistributor creates a new RedisTaskDistributor instance.
func NewRedisTaskDistributor(redisOpt asynq.RedisClientOpt, appLogger *logger.Logger) TaskDistributor {
	client := asynq.NewClient(redisOpt)
	return &RedisTaskDistributor{
		client: client,
		logger: appLogger,
	}
}
