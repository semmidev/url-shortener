# ADR-0023: Security Audit Logging

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Operational logs (Wide Event logging) track HTTP request latency, status codes, and system errors for operational troubleshooting. However, compliance, security forensics, and threat detection require a distinct, tamper-evident audit log that records security-critical actions (user lifecycle, authentication attempts, link modifications, and admin actions) independently from high-volume operational logs.

## Decision

We implemented dedicated security audit logging functionality in `server/internal/platform/logger/audit.go`:

1. **Audit Action Taxonomy**:
   Defined strongly-typed `AuditAction` constants:
   - User authentication: `user.register`, `user.login`, `user.login_failed`, `user.logout`, `user.google_login`, `token.refresh`.
   - URL state mutations: `url.create`, `url.update`, `url.delete`.
   - Admin moderation: `admin.user.suspended`, `admin.url.force_deleted`.

2. **Audit Method (`l.Audit(ctx, action, attrs...)`)**:
   - Automatically injects correlation metadata (`audit.action`, `audit.request_id`, `audit.user_id`) into structured `log/slog` events.
   - Logs security audit records at `INFO` level with message key `"audit"`.
   - Redacts sensitive attributes (passwords, tokens, credentials) before output.

## Consequences

### Positive
- Creates a structured, standardized security event trail across all sensitive domain operations.
- Allows log shippers (Loki, Vector, Fluentd) to filter and route security audit logs (`"msg":"audit"`) to security information and event management (SIEM) systems.
- Aids in forensic analysis and compliance auditing during security incidents.

### Negative
- Developers must explicitly call `l.Audit()` when introducing new security-critical endpoints or administrative operations.
