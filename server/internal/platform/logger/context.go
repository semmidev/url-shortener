package logger

import (
	"context"
	"log/slog"
)

type reqIDCtxKey struct{}

// WithRequestID attaches a request ID to context.
func WithRequestID(ctx context.Context, reqID string) context.Context {
	return context.WithValue(ctx, reqIDCtxKey{}, reqID)
}

// RequestIDFromContext extracts request ID from context.
func RequestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(reqIDCtxKey{}).(string); ok {
		return id
	}
	return ""
}

// ContextHandler is a custom slog.Handler wrapper that automatically injects context attributes into log records.
type ContextHandler struct {
	slog.Handler
}

func NewContextHandler(h slog.Handler) *ContextHandler {
	return &ContextHandler{Handler: h}
}

func (ch *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if reqID := RequestIDFromContext(ctx); reqID != "" {
		r.AddAttrs(slog.String("request_id", reqID))
	}
	return ch.Handler.Handle(ctx, r)
}
