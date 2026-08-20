# Architectural Decision Records (ADR)

This directory contains the Architecture Decision Records (ADRs) for the URL Shortener project, organized by domain categories (`backend`, `frontend`, `infra`, `security`, `testing`).

## Index of ADRs

### ⚙️ Backend (`backend-*`)

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [backend-0001](backend-0001-modular-monolith-architecture.md) | Modular Monolith Architecture | Accepted | 2026-08-19 |
| [backend-0002](backend-0002-uniform-service-method-signatures.md) | Uniform Service Method Signatures & DTO Encapsulation | Accepted | 2026-08-19 |
| [backend-0003](backend-0003-structured-wide-event-logging.md) | Structured Wide Event Logging (`log/slog`) | Accepted | 2026-08-19 |
| [backend-0004](backend-0004-secure-error-handling-redaction.md) | Secure Error Handling & Sensitive Attribute Masking | Accepted | 2026-08-19 |
| [backend-0005](backend-0005-standardized-json-responses.md) | Standardized JSON Responses & Unique Error Codes | Accepted | 2026-08-19 |
| [backend-0006](backend-0006-locale-validation-universal-translator.md) | Universal Translator & Locale Input Validation | Accepted | 2026-08-19 |
| [backend-0007](backend-0007-scalar-api-reference-swagger.md) | Modern Scalar API Reference UI & Swagger OpenAPI Documentation | Accepted | 2026-08-19 |
| [backend-0008](backend-0008-db-error-mapping-atomic-transactions.md) | Database Error Mapping & Atomic Transactions | Accepted | 2026-08-19 |
| [backend-0009](backend-0009-automated-migrations-retry-resiliency.md) | Automated Database Migrations & Retry Resiliency | Accepted | 2026-08-19 |
| [backend-0010](backend-0010-graceful-shutdown.md) | Configurable Graceful Shutdown with Context Timeouts | Accepted | 2026-08-19 |
| [backend-0011](backend-0011-tiered-rate-limiting.md) | Tiered Rate Limiting by Route Classification | Accepted | 2026-08-19 |
| [backend-0012](backend-0012-redis-cache-aside-edge-cache-control.md) | Redis Cache-Aside & Edge Cache-Control Headers | Accepted | 2026-08-19 |
| [backend-0013](backend-0013-product-features-cleanup-preview-qr-dashboard.md) | Product Features (Cleanup Worker, Preview & Safety, QR Code, Dashboard Analytics) | Accepted | 2026-08-19 |
| [backend-0014](backend-0014-multi-instance-redis-state.md) | Multi-Instance State Management with Redis (Rate Limiting, OAuth Codes, Lockout) | Accepted | 2026-08-19 |
| [backend-0015](backend-0015-circuit-breaker-external-calls.md) | Circuit Breaker Pattern for External Dependencies | Accepted | 2026-08-19 |
| [backend-0016](backend-0016-soft-deletes.md) | Database Soft Deletes for Short URLs | Accepted | 2026-08-19 |
| [backend-0017](backend-0017-outbox-pattern-nats-event-bus.md) | Transactional Outbox Pattern & NATS JetStream Event Bus | Accepted | 2026-08-19 |
| [backend-0018](backend-0018-request-timeout-propagation.md) | Request Timeout Propagation & Deadline Handling | Accepted | 2026-08-19 |
| [backend-0019](backend-0019-admin-api-backoffice-rbac.md) | Admin API & Role-Based Access Control (RBAC) | Accepted | 2026-08-19 |
| [backend-0020](backend-0020-comprehensive-cache-invalidation.md) | Comprehensive Cache Invalidation Across Deactivation, Expiry, and Admin Triggers | Accepted | 2026-08-19 |

### 🎨 Frontend (`frontend-*`)

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [frontend-0001](frontend-0001-single-binary-spa-embedding.md) | Single-Binary SPA Embedding with Go `embed.FS` | Accepted | 2026-08-19 |
| [frontend-0002](frontend-0002-browser-html-navigation-redirection.md) | Browser HTML Navigation Redirection for Inactive and Expired Short URLs | Accepted | 2026-08-19 |

### 🛠️ Infrastructure & DevEx (`infra-*`)

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [infra-0001](infra-0001-developer-experience-tooling.md) | Developer Experience & Tooling (Air, Pre-commit, Seed) | Accepted | 2026-08-19 |
| [infra-0002](infra-0002-release-driven-cd-and-semver-automation.md) | Release-Driven Continuous Deployment & Semantic Versioning Automation | Accepted | 2026-08-20 |

### 🔒 Security (`security-*`)

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [security-0001](security-0001-http-security-headers-hardening-csp.md) | HTTP Security Headers Hardening & Route-Tailored Content Security Policy (CSP) | Accepted | 2026-08-19 |
| [security-0002](security-0002-security-audit-logging.md) | Security Audit Logging | Accepted | 2026-08-19 |

### 🧪 Testing (`testing-*`)

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [testing-0001](testing-0001-benchmarks-and-k6-load-testing.md) | Benchmark Testing & k6 Performance Engineering | Accepted | 2026-08-19 |

---

## ADR Format

Each ADR in this directory follows the MADR (Markdown Architecture Decision Record) format:
1. **Title**: Short name describing the decision.
2. **Status**: Status of the decision (`Proposed`, `Accepted`, `Deprecated`, `Superseded`).
3. **Context**: Background details and problem statement.
4. **Decision**: The chosen architecture or code style solution.
5. **Consequences**: Trade-offs, positive and negative implications.
