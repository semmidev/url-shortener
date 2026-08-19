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

### ✅ Circuit Breaker
**Status**: Implemented via `github.com/sony/gobreaker` in `server/internal/platform/breaker` and `user.Service`.

- Wrapped Google OAuth token exchange and userinfo API calls.
- Fast-fails with HTTP 503 `apperr.ServiceUnavailable` when the external service is degraded or circuit breaker trips.

---

### ✅ Retry with Exponential Backoff (beyond DB startup)
**Status**: DB startup retry exists in `migration.go`. No retry elsewhere.

**Missing**:
- No retry on transient database errors (e.g. connection reset, deadlock retry for DB writes).
- No retry on Google OAuth HTTP calls.

---

### ✅ Request Timeout Propagation
**Status**: Implemented via `RequestTimeout(5 * time.Second)` middleware in `server/internal/platform/middleware/timeout.go` and context error mapping in `apperr.MapDBError`.

- Enforces explicit per-request context deadlines across database queries, Redis operations, and downstream handlers.
- Automatically maps `context.DeadlineExceeded` to HTTP 504 `GatewayTimeout`.

---

### ✅ Outbox Pattern / Event Streaming
**Status**: Implemented transactional `outbox_events` table (migration `000004_create_outbox_events.up.sql`), NATS JetStream event bus (`platform/eventbus`), and background outbox worker (`platform/outbox`).

- Decouples analytics click processing from HTTP redirect path.
- Pluggable `EventPublisher` interface allows easy switching to Kafka or RabbitMQ in the future without changing business services.

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

### ✅ Soft Deletes
**Status**: Implemented migration `000003_add_soft_deletes.up.sql` (`deleted_at TIMESTAMPTZ`), partial index `idx_short_urls_deleted_at`, and `POST /api/v1/urls/{id}/restore` endpoint.

- `DeleteShortURL` sets `deleted_at = NOW(), is_active = FALSE` preserving analytics and audit history.
- `RestoreShortURL` clears `deleted_at` and reactivates short URLs.

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

### ✅ Domain Events / Event Bus
**Status**: Implemented pluggable `EventPublisher` interface in `server/internal/platform/eventbus/eventbus.go` and `OutboxWorker` in `server/internal/platform/outbox/outbox_worker.go`.

- Decouples cross-domain side effects via NATS JetStream and in-memory event publishing (`click.recorded`, outbox events).
- Allows seamless future switching to Kafka/RabbitMQ without altering domain services.

---

### ✅ Admin API / Backoffice
**Status**: Implemented RBAC middleware (`RequireRole("admin")`) in `server/internal/platform/middleware/role.go` and `admin` domain package in `server/internal/admin`.

- Protected `/api/v1/admin` route group with JWT authentication and admin role enforcement.
- Admin Endpoints:
  - `GET /api/v1/admin/users` — Paginated user listing and search.
  - `PUT /api/v1/admin/users/{id}/suspend` — Suspend / unsuspend user accounts (blocks logins).
  - `DELETE /api/v1/admin/urls/{id}` — Force delete short URLs regardless of owner.
  - `GET /api/v1/admin/stats` — Platform aggregate statistics (users, URLs, active links, total clicks).

---

## 🧪 Testing

### ❌ Unit Tests for Services (Mocked DB)
**Status**: Only integration (E2E) tests exist for service logic. No unit tests with a mocked `db.Store`.

**Missing**:
- `db.MockStore` using `gomock` or `testify/mock` to unit test each service method in isolation.
- Fast feedback cycle without needing a running PostgreSQL container.

---

### ✅ Benchmark Tests
**Status**: Implemented Go benchmark test suite across internal packages (`make benchmark`).

- `BenchmarkJWTVerify`: Verified token validation speed (~6.6 µs/op).
- `BenchmarkBase62Generate`: Verified random Base62 short code generation speed (~2.0 µs/op).
- `BenchmarkPasswordHash`: Verified bcrypt password hash & check bounds.
- `BenchmarkSyncMapCacheHit`: Verified in-memory lookup overhead (~1.0 µs/op).

---

### ✅ Load / Stress Testing
**Status**: Implemented k6 performance engineering suite under `loadtest/` directory.

- `loadtest/config.js`: Enforces strict SLO targets (`p(95) < 50ms`, `p(99) < 100ms`, `http_req_failed < 1%`).
- `loadtest/smoke_test.js`: Quick verification suite (`make loadtest-smoke`).
- `loadtest/load_test.js`: Ramping load test up to 100 VUs (`make loadtest-load`).
- `loadtest/stress_test.js`: High-concurrency stress test up to 500 VUs (`make loadtest-stress`).

---

## 🚀 Deployment & Infrastructure

### ❌ Kubernetes Manifests / Helm Chart
**Status**: Only `compose.yml` and `Dockerfile` exist.

**Missing**:
- No Kubernetes `Deployment`, `Service`, `Ingress`, `HorizontalPodAutoscaler` manifests.
- No `readinessProbe` / `livenessProbe` configured for the container.
- No resource `limits` and `requests` defined.

---

### ✅ CI Pipeline (Continuous Integration)
**Status**: Implemented via [.github/workflows/ci.yml](file://.github/workflows/ci.yml).

- Executes `golangci-lint` (using `golangci-lint-action@v8`), unit tests (`go test ./...`), E2E integration tests (`go test -tags=integration ./...`), and coverage artifact uploads on every `push` and `pull_request` to `main`.
- Features concurrency cancellation (`cancel-in-progress: true`) for redundant workflow runs.

---

### ❌ CD Pipeline (Continuous Deployment)
**Status**: No automated deployment configuration.

**Missing**:
- No automated Docker image build & push to container registry (GHCR / DockerHub).
- No deployment step (K8s / Helm / Cloud deployment trigger).
- No image signing (Cosign) or SBOM generation (Syft/Trivy).

---

### ✅ Multi-Instance Compatibility
**Status**: Implemented via Redis shared stores with graceful local fallback.

- Shared rate limiting middleware (`RedisRateLimiter`) via Redis atomic `INCR` + `EXPIRE`.
- Shared OAuth single-use code storage (`oauth:code:<code>`).
- Shared failed login attempt tracking & lockout protection (`auth:failed:<email>`).

---

## 📦 Developer Experience

### ✅ Pre-commit Hooks
**Status**: Implemented via `.pre-commit-config.yaml`, `.lefthook.yml`, and `make setup-hooks`.

- Configured automatic pre-commit checks for `gofmt`, `golangci-lint`, and `go test`.

---

### ✅ Local Development with Hot Reload
**Status**: Implemented via Air (`.air.toml`) and `make dev`.

- Run `make dev` to automatically rebuild and restart the backend server on any source file modifications.

---

### ✅ Mock/Seed Data Script
**Status**: Implemented via `server/cmd/seed/main.go` and `make seed`.

- Run `make seed` to populate PostgreSQL with realistic users, short URLs, and click analytics data.

---

## 🎁 Product Features

### ✅ URL Expiration Cleanup Job
**Status**: Implemented background ticker worker in `server/internal/url/service.go` and `DeactivateExpiredURLs` query in `server/db/query/urls.sql`.

- Automatically deactivates expired links (`expires_at < NOW()`) in the background every 1 minute.

---

### ✅ URL Preview / Safety Check
**Status**: Implemented in `server/internal/url/redirect_handler.go`.

- Supports `GET /{code}/preview` and instant `GET /{code}+` endpoints.
- Evaluates target destination domain safety rating (`SAFE` vs `SUSPICIOUS` protocol/IP host analysis).

---

### ✅ QR Code Generation
**Status**: Implemented via `github.com/skip2/go-qrcode` in `server/internal/url/redirect_handler.go` and `server/internal/url/http.go`.

- Endpoints: `GET /{code}/qr` (public) and `GET /api/v1/urls/{id}/qr` (authenticated) returning 256x256 `image/png` QR Code images.

---

### ❌ Custom Domain Support
**Missing**:
- Currently only supports one base domain.
- No multi-tenant custom domain routing (e.g. `links.mycompany.com/abc`).

---

### ✅ User Dashboard Aggregate Stats API
**Status**: Implemented in `server/internal/analytics/service.go` and `server/internal/analytics/http.go`.

- Endpoint: `GET /api/v1/analytics/dashboard` returning total URLs, total clicks, top referrers, device breakdown, and country breakdown across user's URLs.

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
