# ADR-0016: Circuit Breaker for External Dependencies

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Integrating third-party services (such as Google OAuth) introduces external availability risks. If the external provider experiences latency or outages, incoming user requests block until HTTP client timeouts expire, consuming worker goroutines and degrading backend API throughput.

## Decision

We introduced the Circuit Breaker pattern using `github.com/sony/gobreaker`:
1. **Platform Breaker Package (`server/internal/platform/breaker`)**:
   - Encapsulates `gobreaker.CircuitBreaker` with 50% failure ratio thresholds over 5 requests and a 30-second recovery timeout.
   - Automatically maps `ErrOpenState` and `ErrTooManyRequests` to domain HTTP 503 `apperr.ServiceUnavailable`.
2. **Google OAuth Protection**:
   - Wrapped `ExchangeGoogleCode` and `fetchGoogleUser` in `user.Service` with the circuit breaker execution wrapper.

## Consequences

### Positive
- Prevents cascading failure and thread exhaustion during third-party service outages.
- Provides immediate HTTP 503 feedback to callers when downstream dependencies are unhealthy.
- Automatically attempts service recovery after timeout intervals expire.

### Negative
- Requests fail fast during open circuit breaker states until the reset timeout elapses.
