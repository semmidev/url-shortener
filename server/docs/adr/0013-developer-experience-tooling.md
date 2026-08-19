# ADR-0013: Developer Experience & Tooling

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Developing, testing, and debugging backend APIs locally requires efficient workflows. Without hot reload, developers must manually stop and recompile the binary on every change. Without pre-commit hooks, syntax or linting errors break CI runs. Without automated database seeding, testing UI or API contracts requires manually creating data.

## Decision

1. **Air Hot Reload (`make dev`)**:
   - Added `.air.toml` live-reloader configuration watching Go source files and restarting `server/cmd/api` automatically.
2. **Git Pre-commit Hooks (`make setup-hooks`)**:
   - Added `.pre-commit-config.yaml` and `.lefthook.yml` hook configurations enforcing `gofmt`, `golangci-lint`, and `go test` prior to commit creation.
3. **Database Seeding CLI (`make seed`)**:
   - Created `server/cmd/seed/main.go` script populating PostgreSQL with realistic users, short URLs, and click analytics.

## Consequences

### Positive
- Accelerated feedback loop during local development.
- Prevents broken code or formatting issues from reaching Git commits and remote CI.
- One-command setup for realistic development data.

### Negative
- Requires developers to install `air` or `pre-commit`/`lefthook` binaries locally.
