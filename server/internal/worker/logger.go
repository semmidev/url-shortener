package worker

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

// AsynqLogger adapts our structured app logger to hibiken/asynq.Logger interface.
type AsynqLogger struct {
	appLogger *logger.Logger
}

// NewAsynqLogger creates a new logger adapter for Asynq.
func NewAsynqLogger(appLogger *logger.Logger) asynq.Logger {
	return &AsynqLogger{appLogger: appLogger}
}

func (l *AsynqLogger) Debug(args ...interface{}) {
	if l.appLogger != nil {
		l.appLogger.Debug(context.Background(), "asynq_debug", "msg", args)
	}
}

func (l *AsynqLogger) Info(args ...interface{}) {
	if l.appLogger != nil {
		l.appLogger.Info(context.Background(), "asynq_info", "msg", args)
	}
}

func (l *AsynqLogger) Warn(args ...interface{}) {
	if l.appLogger != nil {
		l.appLogger.Warn(context.Background(), "asynq_warn", "msg", args)
	}
}

func (l *AsynqLogger) Error(args ...interface{}) {
	if l.appLogger != nil {
		l.appLogger.Error(context.Background(), "asynq_error", "msg", args)
	}
}

func (l *AsynqLogger) Fatal(args ...interface{}) {
	if l.appLogger != nil {
		l.appLogger.Error(context.Background(), "asynq_fatal", "msg", args)
	}
}
