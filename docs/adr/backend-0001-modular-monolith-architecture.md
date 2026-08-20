# ADR-0001: Modular Monolith Architecture

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

As the backend codebase grows, managing code organization, domain separation, and infrastructure code can become complex. A premature microservices architecture introduces network latency, distributed systems complexity, and deployment overhead. Conversely, an unstructured monolith leads to tight coupling and leaky abstractions.

## Decision

We adopt a **Modular Monolith** architecture:
- **Domain Feature Modules**: High-level feature capabilities are grouped into isolated domain packages under `server/internal/<domain>` (e.g., `user`, `url`, `analytics`).
- **Platform Infrastructure**: Shared cross-cutting technical infrastructure is organized under `server/internal/platform/` (e.g., `logger`, `middleware`, `token`, `validator`, `apperr`, `web`, `postgres`).
- **Composition Root**: `server/internal/app/app.go` serves as the single composition root where database pools, domain services, handlers, and routers are wired together explicitly.

## Consequences

### Positive
- Clear domain boundaries and strict package responsibility separation.
- Simplified local development and single-binary deployment without distributed system complexity.
- Easy to extract individual domain modules into microservices later if scaling demands require it.

### Negative
- Requires developer discipline to prevent inappropriate cross-domain dependencies.
