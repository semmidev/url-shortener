# ADR infra-0003: Asynq Background Task Worker, Dockerfile.worker, & Redis Task Deduplication

* Status: `Accepted`
* Date: 2026-08-21

## Context

As the URL Shortener scales, running background maintenance tasks (such as URL expiration cleanup and cache invalidations) directly inside the HTTP API server process creates CPU/memory contention and disrupts request latency predictability.

Furthermore, when the backend API is scaled horizontally across $N$ replicas, multiple API nodes running background tickers simultaneously could enqueue duplicate background tasks into Redis queues or run redundant database cleanup queries.

## Decision

We implemented a dedicated background task worker architecture backed by `github.com/hibiken/asynq` and Redis:

1. **Standalone Binary Entry Point (`server/cmd/worker`)**:
   - Isolates task execution from the main HTTP API server process (`server/cmd/api`).
2. **Dedicated Worker Dockerfile (`Dockerfile.worker`) & Service**:
   - Containerized as `url-shortener-worker` in `compose.yml` (`dockerfile: Dockerfile.worker`) so API nodes and background workers can be auto-scaled independently.
3. **Dual-Layer Horizontal Scaling Protection & Deduplication**:
   - **Redis Distributed Locking (`AcquireLock`)**: API replicas attempt to acquire a Redis `SETNX` lock (`lock:cron:deactivate_expired_urls`, 55s TTL) before triggering periodic cleanup. Only the single leader API instance that acquires the lock enqueues the task per window.
   - **Asynq Task Deduplication (`asynq.Unique`)**: `DistributeTaskDeactivateExpiredURLs` passes `asynq.Unique(1 * time.Minute)`, ensuring that Redis atomically discards duplicate task payloads enqueued within the deduplication window.

## Consequences

- Complete separation of HTTP traffic processing and background worker execution.
- Safe horizontal scaling across multiple API nodes without duplicate background task execution or redundant database queries.
- Clean container deployment via `Dockerfile.worker` and `compose.yml`.
