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

---

## ADR Format

Each ADR in this directory follows the MADR (Markdown Architecture Decision Record) format:
1. **Title**: Short name describing the decision.
2. **Status**: Status of the decision (`Proposed`, `Accepted`, `Deprecated`, `Superseded`).
3. **Context**: Background details and problem statement.
4. **Decision**: The chosen architecture or code style solution.
5. **Consequences**: Trade-offs, positive and negative implications.
