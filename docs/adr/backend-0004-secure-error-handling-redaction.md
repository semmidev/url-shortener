# ADR-0004: Secure Error Handling & Sensitive Attribute Masking

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Exposing internal stack traces or database errors in API responses creates severe security vulnerabilities (information disclosure). Additionally, logging raw request payloads can leak sensitive credentials (passwords, JWT tokens, API keys) into log storage.

## Decision

1. **Public vs. Internal Error Separation**: Internal SQL/driver errors are logged server-side but masked from end users under safe domain error types (`apperr.Error`).
2. **Automatic Sensitive Attribute Redaction**: A custom `slog.ReplaceAttr` handler (`RedactReplaceAttr`) automatically redacts values for sensitive keys (`password`, `token`, `access_token`, `refresh_token`, `jwt_secret`, `google_client_secret`) with `[REDACTED]`.

## Consequences

### Positive
- Prevents security leaks of sensitive user credentials in log management systems.
- Shields API clients from raw internal database stack traces while providing meaningful public error messages.

### Negative
- Developers must maintain the list of sensitive key names if new secret attributes are added.
