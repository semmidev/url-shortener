package logger

import (
	"context"
	"sync"
)

type eventCtxKey struct{}

// Event accumulates structured attributes for a single logical operation (Wide Event / Canonical Log Line).
type Event struct {
	mu   sync.RWMutex
	args []any
	err  error
}

// NewEvent creates a new Wide Event instance.
func NewEvent() *Event {
	return &Event{
		args: make([]any, 0, 16),
	}
}

// Set adds a key-value attribute pair to the wide event.
func (e *Event) Set(key string, val any) *Event {
	if e == nil {
		return nil
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.args = append(e.args, key, val)
	return e
}

// SetError attaches an error to the wide event.
func (e *Event) SetError(err error) *Event {
	if e == nil || err == nil {
		return nil
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.err = err
	e.args = append(e.args, "error", err.Error())
	return e
}

// Err returns the attached error if any.
func (e *Event) Err() error {
	if e == nil {
		return nil
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.err
}

// Args returns all accumulated attributes as a slice suitable for slog loggers.
func (e *Event) Args() []any {
	if e == nil {
		return nil
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	copied := make([]any, len(e.args))
	copy(copied, e.args)
	return copied
}

// WithEvent attaches a Wide Event to the context.
func WithEvent(ctx context.Context, ev *Event) context.Context {
	return context.WithValue(ctx, eventCtxKey{}, ev)
}

// EventFromContext retrieves the Wide Event from context if present.
func EventFromContext(ctx context.Context) (*Event, bool) {
	ev, ok := ctx.Value(eventCtxKey{}).(*Event)
	return ev, ok && ev != nil
}

// Enrich safely sets a key-value attribute on the Wide Event in context.
func Enrich(ctx context.Context, key string, val any) {
	if ev, ok := EventFromContext(ctx); ok {
		ev.Set(key, val)
	}
}
