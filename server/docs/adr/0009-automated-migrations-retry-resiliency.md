# ADR-0009: Automated Database Migrations & Retry Resiliency

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Running database schema migrations manually during deployment leads to human errors and schema drift between environments. In containerized environments (Kubernetes, Docker Compose), the backend application container often starts up before the PostgreSQL database container is ready to accept connections.

## Decision

- Execute database migrations automatically during application startup via `app.RunDBMigration` using `golang-migrate`.
- Implement an exponential backoff connection retry loop (up to 15 seconds) inside `postgres.NewPool` and migration runner to gracefully wait for PostgreSQL to finish initialization.

## Consequences

### Positive
- Zero manual intervention required for database migrations across local, test, and production environments.
- Prevents container boot loop crashes when starting alongside database containers.

### Negative
- Application startup takes slightly longer if PostgreSQL takes time to initialize.
