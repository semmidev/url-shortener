package worker

import (
	"context"

	"github.com/hibiken/asynq"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

const (
	QueueCritical = "critical"
	QueueDefault  = "default"
)

// TaskProcessor defines the contract for consuming background tasks.
type TaskProcessor interface {
	Start() error
	Shutdown()
	ProcessTaskDeactivateExpiredURLs(ctx context.Context, task *asynq.Task) error
	ProcessTaskRecordClickAnalytics(ctx context.Context, task *asynq.Task) error
	ProcessTaskRecordAuditLog(ctx context.Context, task *asynq.Task) error
}

// RedisTaskProcessor is an Asynq-backed task processor server.
type RedisTaskProcessor struct {
	server *asynq.Server
	store  db.Store
	logger *logger.Logger
	cache  cache.Cache
}

// NewRedisTaskProcessor creates a new task processor instance.
func NewRedisTaskProcessor(
	redisOpt asynq.RedisClientOpt,
	store db.Store,
	appLogger *logger.Logger,
	c cache.Cache,
	concurrency int,
) TaskProcessor {
	if concurrency <= 0 {
		concurrency = 10
	}

	asynqLogger := NewAsynqLogger(appLogger)

	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: concurrency,
			Queues: map[string]int{
				QueueCritical: 10,
				QueueDefault:  5,
			},
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				if appLogger != nil {
					appLogger.Error(ctx, "asynq_task_failed",
						"task_type", task.Type(),
						"error", err,
						"payload", string(task.Payload()),
					)
				}
			}),
			Logger: asynqLogger,
		},
	)

	return &RedisTaskProcessor{
		server: server,
		store:  store,
		logger: appLogger,
		cache:  c,
	}
}

// Start registers task handlers and starts the Asynq server.
func (processor *RedisTaskProcessor) Start() error {
	mux := asynq.NewServeMux()

	mux.HandleFunc(TaskDeactivateExpiredURLs, processor.ProcessTaskDeactivateExpiredURLs)
	mux.HandleFunc(TaskRecordClickAnalytics, processor.ProcessTaskRecordClickAnalytics)
	mux.HandleFunc(TaskRecordAuditLog, processor.ProcessTaskRecordAuditLog)

	return processor.server.Start(mux)
}

// Shutdown gracefully shuts down the Asynq server.
func (processor *RedisTaskProcessor) Shutdown() {
	processor.server.Shutdown()
}
