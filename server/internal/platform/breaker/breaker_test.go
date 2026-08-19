package breaker_test

import (
	"errors"
	"testing"
	"time"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/breaker"
)

func TestCircuitBreaker_Tripping(t *testing.T) {
	cb := breaker.NewCircuitBreaker("test-service", 100*time.Millisecond)

	// Execute 5 failing requests to trip circuit breaker (threshold: >= 5 requests, >= 50% failures)
	dummyErr := errors.New("connection failed")
	for i := 0; i < 5; i++ {
		_, _ = cb.Execute(func() (interface{}, error) {
			return nil, dummyErr
		})
	}

	// 6th request should fail fast with ServiceUnavailable error
	_, err := cb.Execute(func() (interface{}, error) {
		return "success", nil
	})

	if err == nil {
		t.Fatalf("expected circuit breaker to trip, got nil error")
	}

	var appErr *apperr.Error
	if !errors.As(err, &appErr) || appErr.Status != 503 {
		t.Fatalf("expected HTTP 503 ServiceUnavailable error, got %v", err)
	}
}
