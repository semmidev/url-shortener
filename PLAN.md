# PLAN.md — URL Shortener: Missing Aspects & Improvement Roadmap

This document audits what is currently implemented and lists everything that is **missing or incomplete** across observability, security, reliability, developer experience, and product feature dimensions.

---

## 📋 Table of Contents
- [🔭 Observability](#-observability)
- [🔒 Security](#-security)
- [🛡️ Reliability & Resilience](#️-reliability--resilience)
- [⚡ Performance & Caching](#-performance--caching)
- [🗄️ Database & Data Layer](#️-database--data-layer)
- [🏗️ Architecture & Code Quality](#️-architecture--code-quality)
- [🧪 Testing](#-testing)
- [🚀 Deployment & Infrastructure](#-deployment--infrastructure)
- [📦 Developer Experience](#-developer-experience)
- [🎁 Product Features](#-product-features)

---

## 🔭 Observability

### ❌ Distributed Tracing (OpenTelemetry)
**Status**: `go.opentelemetry.io/otel` is already an **indirect** transitive dependency (pulled in by testcontainers), but **zero tracing instrumentation is wired**.

**Missing**:
- No `TracerProvider` initialized or exported.
- No trace context propagation (`W3C TraceContext` / `B3` headers) across HTTP boundaries.
- No spans created for database queries (`pgx/v5` instrumentation via `otelpgx`).
- No OTLP exporter configured (Jaeger, Tempo, or Cloud Trace).

**Recommended approach**:
```go
// platform/telemetry/tracer.go
tp := otel.GetTracerProvider()
// Wire otel middleware: otelhttp.NewHandler(r, "url-shortener")
// Wire pgx tracer: pgxpool.Config.Tracer = otelpgx.NewTracer()
```

---

### ❌ Metrics (Prometheus / OpenTelemetry Metrics)
**Status**: No metrics instrumentation whatsoever.

**Missing**:
- No `MeterProvider` initialized.
- No HTTP request counter/histogram (request count, latency distribution, error rate).
- No database pool metrics (active connections, wait count).
- No business metrics (short URLs created per minute, redirect rate, auth failure rate).
- No `/metrics` endpoint (Prometheus scrape target).

**Recommended approach**: `go.opentelemetry.io/otel/metric` + `prometheus` exporter or `go-chi/chi` middleware with `prometheus/client_golang`.

---

### ✅ Structured Logging
**Status**: Wide Event logging with `log/slog` is implemented and redaction works.

**Missing**:
- No **correlation between trace ID and log lines** (inject `trace_id`/`span_id` into Wide Event from OpenTelemetry context).
- No **log sampling** for high-volume redirect endpoint (300 req/min × all logs = log flood in production).
- No **log shipping configuration** (Fluentd, Vector, or Loki sidecar).

---

### ✅ Health Check Enhancements
**Status**: `/health` returns basic `{"status":"ok"}`.

**Missing**:
- No **liveness vs readiness** separation (Kubernetes-style `/health/live` vs `/health/ready`).
- No **dependency health checks**: PostgreSQL ping, external service reachability.
- `/health` currently does not verify DB connection is alive.

---

## 🔒 Security

### ⏭️ CSRF Protection (skipped — Bearer token API is not vulnerable to CSRF)
**Status**: Not implemented.

**Missing**:
- No CSRF token validation on state-changing endpoints (`POST`, `PUT`, `DELETE`).
- Especially important for cookie-based auth flows if a web frontend is added.
- Recommended: `gorilla/csrf` or a custom double-submit cookie pattern.

---

### ✅ Security Headers (HTTP Hardening)
**Status**: Only CORS headers are set.

**Missing**:
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- `Permissions-Policy`

**Recommended approach**: `unrolled/secure` middleware or custom `SecureHeaders` middleware.

---

### ✅ Input Sanitization (XSS / Injection Prevention)
**Status**: Validator checks format/required but does not sanitize HTML.

**Missing**:
- `original_url` should be validated against allowlisted URL schemes and blocked for `javascript:`, `data:`, `vbscript:` URIs.
- `title` field should be HTML-escaped on output to prevent stored XSS if rendered in a web UI.

---

### ✅ Token Blacklisting / Session Revocation (Logout endpoint)
**Status**: Sessions can be blocked in DB (`is_blocked` column) but there is **no active enforcement on access tokens**.

**Missing**:
- JWT access tokens, once issued, are valid until expiry even if the session is blocked (15-minute window).
- No Redis-backed token denylist (or short-lived token with server-side session check).
- No `Logout` endpoint that invalidates both access and refresh tokens.

---

### ✅ Brute-Force / Credential Stuffing Protection
**Status**: Rate limiting on auth endpoints (10 req/min globally) exists but is IP-based only.

**Missing**:
- No **per-email** rate limiting (1 IP can try 10 different emails).
- No **account lockout** after N failed attempts per user.
- No **CAPTCHA** or proof-of-work challenge for suspicious traffic.

---

### ❌ Secret Management
**Status**: Secrets loaded via `.env` / `app.env` and Viper.

**Missing**:
- No integration with a secrets manager (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager).
- JWT secret, DB credentials, and Google OAuth secrets currently stored in plaintext env files.
- No secret rotation mechanism.

---

### ❌ TLS / mTLS
**Status**: App listens on plain HTTP. TLS is assumed to be terminated at reverse proxy.

**Missing**:
- No TLS configuration in Go HTTP server (production hardening).
- No mutual TLS (mTLS) between internal services if the architecture is ever decomposed.
- Documentation does not mention required TLS termination setup (nginx, caddy, etc.).

---

### ✅ Audit Logging
**Status**: Wide Event logs capture HTTP requests but at an operational level only.

**Missing**:
- No tamper-evident audit trail for security-sensitive operations:
  - User account creation / deletion
  - Password changes / Google OAuth link
  - URL creation / deletion
  - Admin role changes (if ever added)
- No separate audit log sink (different from operational logs).

---

## 🛡️ Reliability & Resilience

### ❌ Circuit Breaker
**Status**: No circuit breaker pattern implemented.

**Missing**:
- No circuit breaker on Google OAuth HTTP calls (`https://oauth2.googleapis.com/token`, `https://www.googleapis.com/oauth2/v2/userinfo`).
- If Google API is degraded, every auth request will hang until `http.Client` timeout (10s).
- Recommended: `sony/gobreaker` or `failsafe-go`.

---

### ✅ Retry with Exponential Backoff (beyond DB startup)
**Status**: DB startup retry exists in `migration.go`. No retry elsewhere.

**Missing**:
- No retry on transient database errors (e.g. connection reset, deadlock retry for DB writes).
- No retry on Google OAuth HTTP calls.

---

### ❌ Request Timeout Propagation
**Status**: HTTP server read/write timeouts exist but per-request context deadlines are not explicitly set.

**Missing**:
- No `context.WithTimeout` per service method call.
- Database queries can run indefinitely if the DB stalls.

---

### ❌ Outbox Pattern / Event Streaming
**Status**: Analytics click events are written synchronously in the redirect path.

**Missing**:
- Writing to `url_analytics` in the redirect critical path adds latency.
- No async event queue (in-memory channel, Kafka, NATS) to defer analytics writes.
- Risk: if DB is slow, redirect latency degrades for the end user.

---

## ⚡ Performance & Caching

### ✅ Caching Layer (Redis)
**Status**: Implemented via `github.com/redis/go-redis/v9` with Cache-Aside pattern in `server/internal/platform/cache/redis.go` and `server/internal/url/service.go`.

- **Short URL lookup cache** (`url:code:<code proposal> → original_url, active, expires_at`) with automatic cache invalidation on `Update` and `Delete`.
- **Redis Infrastructure**: Integrated into `compose.dev.yml` and `compose.yml`.

---

### ✅ CDN / Edge Caching for Redirects
**Status**: Configured in `server/internal/url/redirect_handler.go`.

- Set HTTP `Cache-Control` header on redirect responses (`public, max-age=300, s-maxage=3600`) to support CDN and Edge node caching (Cloudflare, Fastly).

---

### ✅ Database Query Optimization
**Status**: Migration `000002_optimize_indexes.up.sql` created and verified.

- Added composite index `idx_url_analytics_url_clicked` on `url_analytics (url_id, clicked_at DESC)`.
- Added PostgreSQL `pg_trgm` extension and GIN trigram indexes on `short_urls(title)` and `short_urls(original_url)` for accelerated substring search (`ILIKE`).

---

## 🗄️ Database & Data Layer

### ❌ Soft Deletes
**Status**: `DeleteShortURL` is a hard delete (`DELETE FROM short_urls`).

**Missing**:
- No soft delete (`deleted_at TIMESTAMPTZ`, `is_deleted BOOL`).
- Analytics data for deleted URLs is cascade-deleted, losing historical data.
- No ability to restore accidentally deleted short URLs.

---

### ❌ Database Read Replicas
**Status**: Single connection pool pointing at one PostgreSQL instance.

**Missing**:
- No read/write split (write to primary, read from replica).
- No `pgBouncer` connection pooler in front of PostgreSQL for high-concurrency scenarios.

---

### ❌ Database Backup & Point-in-Time Recovery
**Status**: No backup strategy documented or scripted.

**Missing**:
- No `pg_dump` cron job or WAL archiving configured in `compose.yml`.
- No restore procedure documented.

---

## 🏗️ Architecture & Code Quality

### ❌ Domain Events / Event Bus
**Status**: No internal event bus.

**Missing**:
- No way to decouple cross-domain side effects (e.g. "when URL is deleted, also notify analytics service").
- Tight coupling between redirect handler and analytics handler through direct function call.

---

### ❌ Admin API / Backoffice
**Status**: No admin role enforcement beyond the `role` field stored in DB.

**Missing**:
- No `/api/v1/admin/` route group with role-based access control.
- No admin endpoints (list all users, suspend accounts, force-delete URLs, view system stats).
- `role` field is set but never checked beyond what JWT payload carries.

---

## 🧪 Testing

### ❌ Unit Tests for Services (Mocked DB)
**Status**: Only integration (E2E) tests exist for service logic. No unit tests with a mocked `db.Store`.

**Missing**:
- `db.MockStore` using `gomock` or `testify/mock` to unit test each service method in isolation.
- Fast feedback cycle without needing a running PostgreSQL container.

---

### ❌ Benchmark Tests
**Status**: No benchmark tests.

**Missing**:
- `BenchmarkRedirect` — measure redirect latency with and without cache.
- `BenchmarkJWTVerify` — ensure token verification is within acceptable bounds.
- `BenchmarkListURLs` — measure pagination performance at scale.

---

### ❌ Load / Stress Testing
**Status**: No load testing scripts or infrastructure.

**Missing**:
- No `k6`, `hey`, or `vegeta` scripts for load testing redirect endpoint.
- No SLO targets defined (e.g. "p99 redirect latency < 50ms at 1000 RPS").

---

### ❌ Contract Testing
**Status**: No API contract tests.

**Missing**:
- No Pact or OpenAPI response validation tests to ensure API responses match the Swagger spec.

---

## 🚀 Deployment & Infrastructure

### ❌ Kubernetes Manifests / Helm Chart
**Status**: Only `compose.yml` and `Dockerfile` exist.

**Missing**:
- No Kubernetes `Deployment`, `Service`, `Ingress`, `HorizontalPodAutoscaler` manifests.
- No `readinessProbe` / `livenessProbe` configured for the container.
- No resource `limits` and `requests` defined.

---

### ❌ CI/CD Pipeline
**Status**: No CI/CD configuration.

**Missing**:
- No GitHub Actions workflow (lint → test → build → push Docker image → deploy).
- No automated integration test run on PR.
- No image signing / SBOM generation.

---

### ❌ Multi-Instance Compatibility
**Status**: Stateful in-process stores break horizontal scaling.

**Missing**:
- In-memory rate limiter (`httprate`) is **not shared across multiple instances**.
- One-time OAuth code store (`sync.Map`) is **in-process only** — breaks with multiple replicas.
- Both need Redis-backed equivalents for multi-replica deployments.

---

## 📦 Developer Experience

### ❌ Pre-commit Hooks
**Missing**:
- No `lefthook` or `pre-commit` hooks: auto-run `go fmt`, `golangci-lint`, `go test` before each commit.

---

### ❌ Local Development with Hot Reload
**Missing**:
- No `air` or `watchexec` integration for hot-reload on file changes.
- Recommended: `cosmtrek/air` via `make dev` target.

---

### ❌ Mock/Seed Data Script
**Missing**:
- No `make seed` command to populate DB with realistic test data (users, short URLs, analytics events).

---

## 🎁 Product Features

### ❌ URL Expiration Cleanup Job
**Missing**:
- Expired URLs (`expires_at < NOW()`) are currently **not automatically cleaned up** or deactivated.
- No background job or `pg_cron` to deactivate expired entries.

---

### ❌ URL Preview / Safety Check
**Missing**:
- No "preview" page before redirect (e.g. `/{code}+` shows where the link goes).
- No integration with Google Safe Browsing API to flag malicious URLs.

---

### ❌ QR Code Generation
**Missing**:
- No QR code generation endpoint (`GET /api/v1/urls/{id}/qr`).

---

### ❌ Custom Domain Support
**Missing**:
- Currently only supports one base domain.
- No multi-tenant custom domain routing (e.g. `links.mycompany.com/abc`).

---

### ❌ User Dashboard Aggregate Stats API
**Missing**:
- No aggregate statistics endpoint (total clicks today, top referrers, device breakdown).
- Analytics raw events exist but no rollup/aggregation queries.

---

### ❌ Webhook / Notification Support
**Missing**:
- No webhook delivery when a short URL reaches a click threshold.
- No email notification support.

---

## 📊 Priority Summary

| Priority | Category | Item |
|:---:|:---|:---|
| 🔴 **Critical** | Performance | Redis caching for redirect lookup |
| 🔴 **Critical** | Reliability | Async analytics write (decouple from redirect path) |
| 🔴 **Critical** | Security | Logout endpoint + access token denylist |
| 🔴 **Critical** | Deployment | CI/CD GitHub Actions pipeline |
| 🟠 **High** | Observability | OpenTelemetry tracing + Prometheus metrics |
| 🟠 **High** | Security | Security headers middleware (HSTS, CSP, X-Frame-Options) |
| 🟠 **High** | Security | Per-email rate limiting + account lockout |
| 🟠 **High** | Testing | Unit tests with mocked DB store (gomock) |
| 🟠 **High** | Deployment | Kubernetes manifests / Helm chart |
| 🟡 **Medium** | Observability | Liveness vs readiness health checks |
| 🟡 **Medium** | Reliability | Circuit breaker for Google OAuth calls |
| 🟡 **Medium** | Database | Soft deletes + expired URL cleanup job |
| 🟡 **Medium** | DX | Air hot-reload (`make dev`) |
| 🟡 **Medium** | DX | Seed data script (`make seed`) |
| 🟢 **Low** | Features | QR code generation |
| 🟢 **Low** | Features | URL preview page |
| 🟢 **Low** | Features | Webhook / notification support |
| 🟢 **Low** | Architecture | Admin API / Backoffice routes |
