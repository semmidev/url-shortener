package retry

import (
	"context"
	"errors"
	"math/rand/v2"
	"net"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// Config defines the configuration parameters for retrying operations.
type Config struct {
	MaxAttempts int
	InitialWait time.Duration
	MaxWait     time.Duration
	Jitter      bool
}

// DefaultConfig provides sensible defaults for database and network operations.
func DefaultConfig() Config {
	return Config{
		MaxAttempts: 3,
		InitialWait: 100 * time.Millisecond,
		MaxWait:     2 * time.Second,
		Jitter:      true,
	}
}

// IsTransientError checks if the given error is considered transient (temporary).
// This includes network timeouts, connection refused/reset, and database deadlock/serialization failures.
func IsTransientError(err error) bool {
	if err == nil {
		return false
	}

	// 1. Check for standard network errors
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}

	// 2. Check for syscall connection errors
	var errno syscall.Errno
	if errors.As(err, &errno) {
		if errno == syscall.ECONNREFUSED || errno == syscall.ECONNRESET || errno == syscall.ETIMEDOUT || errno == syscall.EPIPE {
			return true
		}
	}

	// 3. Check for specific PostgreSQL transient error codes (deadlock, serialization failure, connection breakdown)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "40001": // serialization_failure
			return true
		case "40P01": // deadlock_detected
			return true
		case "57P01", "57P02", "57P03": // admin_shutdown, crash_shutdown, cannot_connect_now
			return true
		}
	}

	return false
}

// Do executes the operation `fn` with exponential backoff if it returns a transient error.
func Do(ctx context.Context, cfg Config, fn func() error) error {
	var err error
	wait := cfg.InitialWait

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		// Check context before execution
		if err := ctx.Err(); err != nil {
			return err
		}

		err = fn()
		if err == nil {
			return nil
		}

		// Don't retry if this is the last attempt or if the error is not transient
		if attempt == cfg.MaxAttempts || !IsTransientError(err) {
			break
		}

		// Calculate sleep duration
		sleepDur := wait
		if cfg.Jitter {
			// Add full jitter (0 to sleepDur)
			//nolint:gosec
			sleepDur = time.Duration(rand.Int64N(int64(sleepDur)))
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(sleepDur):
		}

		// Double wait time up to max wait
		wait *= 2
		if wait > cfg.MaxWait {
			wait = cfg.MaxWait
		}
	}

	return err
}
