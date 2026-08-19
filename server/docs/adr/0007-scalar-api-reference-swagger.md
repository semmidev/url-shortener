# ADR-0007: Modern Scalar API Reference UI & Swagger OpenAPI Documentation

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

API documentation often becomes outdated if kept in separate wikis or external tools. Modern developer portals require interactive testing and visually attractive API documentation.

## Decision

- Annotate HTTP handler functions with Swaggo (`@Summary`, `@Tags`, `@Param`, `@Success`, `@Failure`) code comments.
- Automatically generate OpenAPI 2.0 / 3.0 specification artifacts (`server/docs/swagger.json`, `server/docs/swagger.yaml`) via `make swagger`.
- Serve the modern **Scalar API Reference UI** at `/docs` (rendering directly from `/swagger/doc.json`) alongside the classic Swagger UI at `/swagger/index.html`.

## Consequences

### Positive
- Interactive, zero-maintenance API documentation generated straight from Go source code.
- Superior developer experience provided by the modern Scalar UI interface.

### Negative
- Developers must maintain Swaggo docstrings on HTTP handlers when modifying endpoint contracts.
