package telemetry

import (
	"context"
	"testing"
	"time"
)

func TestInitTracer(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 2*time.Second)
	defer cancel()

	shutdown, err := InitTracer(ctx, "test-service", "localhost:4317")
	if err != nil {
		t.Fatalf("expected no error during tracer init, got %v", err)
	}
	if shutdown == nil {
		t.Fatal("expected non-nil shutdown function")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(t.Context(), 2*time.Second)
	defer shutdownCancel()

	if err := shutdown(shutdownCtx); err != nil {
		t.Errorf("expected clean shutdown, got %v", err)
	}
}
