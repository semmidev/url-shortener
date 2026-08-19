# Architectural Decision Records (ADR)

This directory contains the Architecture Decision Records (ADRs) for the URL Shortener project.

## Index of ADRs

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [ADR-0001](0001-modular-monolith-architecture.md) | Modular Monolith Architecture | Accepted | 2026-08-19 |
| [ADR-0002](0002-uniform-service-method-signatures.md) | Uniform Service Method Signatures & DTO Encapsulation | Accepted | 2026-08-19 |
| [ADR-0003](0003-structured-wide-event-logging.md) | Structured Wide Event Logging (`log/slog`) | Accepted | 2026-08-19 |
| [ADR-0004](0004-secure-error-handling-redaction.md) | Secure Error Handling & Sensitive Attribute Masking | Accepted | 2026-08-19 |
| [ADR-0005](0005-standardized-json-responses.md) | Standardized JSON Responses & Unique Error Codes | Accepted | 2026-08-19 |
| [ADR-0006](0006-locale-validation-universal-translator.md) | Universal Translator & Locale Input Validation | Accepted | 2026-08-19 |
| [ADR-0007](0007-scalar-api-reference-swagger.md) | Modern Scalar API Reference UI & Swagger OpenAPI Documentation | Accepted | 2026-08-19 |
| [ADR-0008](0008-db-error-mapping-atomic-transactions.md) | Database Error Mapping & Atomic Transactions | Accepted | 2026-08-19 |
| [ADR-0009](0009-automated-migrations-retry-resiliency.md) | Automated Database Migrations & Retry Resiliency | Accepted | 2026-08-19 |
| [ADR-0010](0010-graceful-shutdown.md) | Configurable Graceful Shutdown with Context Timeouts | Accepted | 2026-08-19 |
| [ADR-0011](0011-tiered-rate-limiting.md) | Tiered Rate Limiting by Route Classification | Accepted | 2026-08-19 |
| [ADR-0012](0012-redis-cache-aside-edge-cache-control.md) | Redis Cache-Aside & Edge Cache-Control Headers | Accepted | 2026-08-19 |
| [ADR-0013](0013-developer-experience-tooling.md) | Developer Experience & Tooling (Air, Pre-commit, Seed) | Accepted | 2026-08-19 |
| [ADR-0014](0014-product-features-cleanup-preview-qr-dashboard.md) | Product Features (Cleanup Worker, Preview & Safety, QR Code, Dashboard Analytics) | Accepted | 2026-08-19 |
| [ADR-0015](0015-multi-instance-redis-state.md) | Multi-Instance State Management with Redis (Rate Limiting, OAuth Codes, Lockout) | Accepted | 2026-08-19 |
| [ADR-0016](0016-circuit-breaker-external-calls.md) | Circuit Breaker Pattern for External Dependencies | Accepted | 2026-08-19 |
| [ADR-0017](0017-soft-deletes.md) | Database Soft Deletes for Short URLs | Accepted | 2026-08-19 |
| [ADR-0018](0018-outbox-pattern-nats-event-bus.md) | Transactional Outbox Pattern & NATS JetStream Event Bus | Accepted | 2026-08-19 |
| [ADR-0019](0019-request-timeout-propagation.md) | Request Timeout Propagation & Deadline Handling | Accepted | 2026-08-19 |
| [ADR-0020](0020-admin-api-backoffice-rbac.md) | Admin API & Role-Based Access Control (RBAC) | Accepted | 2026-08-19 |

---

## ADR Format

Each ADR in this directory follows the MADR (Markdown Architecture Decision Record) format:
1. **Title**: Short name describing the decision.
2. **Status**: Status of the decision (`Proposed`, `Accepted`, `Deprecated`, `Superseded`).
3. **Context**: Background details and problem statement.
4. **Decision**: The chosen architecture or code style solution.
5. **Consequences**: Trade-offs, positive and negative implications.
