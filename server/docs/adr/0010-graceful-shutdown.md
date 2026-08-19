# ADR-0010: Configurable Graceful Shutdown with Context Timeouts

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Abruptly terminating an API process (e.g. during deployment rollout or container termination) can drop active HTTP requests, corrupt ongoing transactions, or leave open database connections.

## Decision

- Intercept OS signals (`SIGINT`, `SIGTERM`) in `main.go` / `app.Run`.
- Stop accepting new incoming HTTP connections immediately.
- Provide a configurable grace period (`SERVER_SHUTDOWN_TIMEOUT`, default: `10s`) for active HTTP handlers to complete their work before closing database connection pools and exiting.

## Consequences

### Positive
- Zero dropped requests or broken user transactions during application restarts and deployments.
- Clean container teardown in orchestration systems (Kubernetes, Docker Swarm).

### Negative
- Process termination waits up to `SERVER_SHUTDOWN_TIMEOUT` seconds if long-running HTTP requests are active.
