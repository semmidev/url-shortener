# ADR-0019: Request Timeout Propagation

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Without explicit per-request context deadline propagation, stalled database queries or slow downstream calls consume application worker goroutines indefinitely, leading to resource exhaustion under load.

## Decision

We implemented global request timeout propagation:
1. **Timeout Middleware (`server/internal/platform/middleware/timeout.go`)**:
   - Encapsulates `r.Context()` with `context.WithTimeout(r.Context(), 5 * time.Second)` across all API and redirection routes.
2. **Context Deadline Error Mapping (`server/internal/platform/apperr/apperr.go`)**:
   - `MapDBError` checks for `errors.Is(err, context.DeadlineExceeded)` and PostgreSQL query cancellation code `57014`.
   - Automatically maps context timeouts to HTTP 504 `GatewayTimeout`.

## Consequences

### Positive
- Enforces strict execution bounds (5s) for all database operations, Redis lookups, and downstream handlers.
- Prevents thread/goroutine leaks when PostgreSQL or downstream services stall.
- Provides standard HTTP 504 Gateway Timeout feedback to API callers.

### Negative
- Requests taking longer than 5 seconds will be aborted automatically.
