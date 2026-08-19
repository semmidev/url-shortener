package breaker

import (
	"errors"
	"fmt"
	"time"

	"github.com/sony/gobreaker"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

// CircuitBreaker wraps gobreaker.CircuitBreaker for external API calls.
type CircuitBreaker struct {
	cb *gobreaker.CircuitBreaker
}

// NewCircuitBreaker creates a new circuit breaker instance with production default settings.
func NewCircuitBreaker(name string, timeout time.Duration) *CircuitBreaker {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	st := gobreaker.Settings{
		Name:        name,
		MaxRequests: 5,
		Interval:    60 * time.Second,
		Timeout:     timeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.5
		},
	}

	return &CircuitBreaker{
		cb: gobreaker.NewCircuitBreaker(st),
	}
}

// Execute runs the action under circuit breaker protection and maps breaker errors to apperr.
func (c *CircuitBreaker) Execute(req func() (interface{}, error)) (interface{}, error) {
	if c == nil || c.cb == nil {
		return req()
	}

	res, err := c.cb.Execute(req)
	if err != nil {
		if errors.Is(err, gobreaker.ErrOpenState) || errors.Is(err, gobreaker.ErrTooManyRequests) {
			return nil, apperr.ServiceUnavailable(fmt.Sprintf("external service (%s) is temporarily unavailable due to circuit breaker trip", c.cb.Name()))
		}
		return nil, err
	}

	return res, nil
}
