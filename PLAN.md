# PLAN.md — URL Shortener: Audit & Improvement Roadmap

This document audits what is currently implemented in the codebase and outlines all remaining **missing or incomplete** aspects across observability, security, reliability, performance, database, testing, deployment, developer experience, and product feature dimensions.

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
- [📊 Priority Summary](#-priority-summary)

---

## 🔭 Observability

### ❌ Distributed Tracing (OpenTelemetry)
**Status**: `go.opentelemetry.io/otel` is an indirect transitive dependency (via testcontainers), but **no tracing instrumentation is wired**.

**Missing**:
- No `TracerProvider` initialized or exported.
- No trace context propagation (`W3C TraceContext` / `traceparent` headers) across HTTP boundaries.
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
**Status**: No metrics instrumentation in Go services.

**Missing**:
- No `MeterProvider` initialized.
- No HTTP request counter/histogram (request count, latency distribution, error rate).
- No database pool metrics (active connections, wait count).
- No business metrics (short URLs created per minute, redirect rate, auth failure rate).
- No `/metrics` endpoint (Prometheus scrape target).

**Recommended approach**: `go.opentelemetry.io/otel/metric` + Prometheus exporter (`prometheus/client_golang`).

---

### ✅ Structured Wide Event Logging
**Status**: Implemented using Go `log/slog` with structured Wide Event logging and sensitive header/body redaction (`server/internal/platform/middleware/logging.go`).

**Missing**:
- Correlation between trace ID and log lines (inject `trace_id`/`span_id` into Wide Event from OpenTelemetry context when tracing is wired).
- Log shipping sidecar configuration (Fluentd, Vector, or Loki).

---

### ✅ Liveness & Readiness Health Checks
**Status**: Implemented in `server/internal/app/app.go`.

- `/health/live`: Liveness check verifying the application process is running.
- `/health/ready`: Readiness check pinging PostgreSQL connection pool.
- `/health`: Legacy health check returning service version and DB status for backwards compatibility.

---

## 🔒 Security

### ⏭️ CSRF Protection (Skipped — API uses Bearer token auth)
**Status**: API endpoints rely on standard HTTP `Authorization: Bearer <token>` headers, which browsers do not attach automatically, mitigating CSRF risks.

---

### ✅ Security Headers (HTTP Hardening)
**Status**: Implemented via custom middleware `server/internal/platform/middleware/secure_headers.go`.

- Standard Security Headers set: `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`.
- Dynamic CSP header tailored per route type (strict for APIs, relaxed for SPA and Swagger UI).

---

### ✅ Session Revocation & Logout
**Status**: Implemented in `server/internal/user/service.go` and `server/internal/user/http.go`.

- Endpoint: `POST /api/v1/auth/logout`.
- Revokes user sessions in PostgreSQL (`sessions` table) and records audit log entries.

---

### ✅ Brute-Force & Account Lockout Protection
**Status**: Implemented in `server/internal/user/service.go`.

- Tracks failed login attempts per email address (`maxEmailLoginAttempts = 10`, `emailLockoutWindow = 15m`).
- Leverages Redis atomic `INCR` + `EXPIRE` with local fallback map to temporarily lock accounts under brute-force attacks.

---

### ✅ Tamper-Evident Audit Logging
**Status**: Implemented in `server/internal/platform/logger/audit.go`.

- Emits structured audit logs (`audit.action`) for security-sensitive operations: user registration, login, failed login attempts, logout, Google OAuth login, URL creation, URL updates, URL soft-deletion, token refresh, admin user suspension, and admin force-deletion.

---

### ❌ Centralized Secret Management
**Status**: Secrets loaded via `.env` / `app.env` and Viper.

**Missing**:
- No integration with a dedicated secrets manager (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager).
- JWT secret, DB credentials, and Google OAuth secrets currently stored in environment variables.

---

### ❌ TLS / mTLS
**Status**: App listens on plain HTTP (`SERVER_ADDRESS`). TLS termination is deferred to edge reverse proxy.

**Missing**:
- No TLS listener configuration in Go HTTP server for direct TLS termination.
- Documentation lacks explicit TLS reverse proxy configurations (Nginx, Caddy, Cloudflare).

---

## 🛡️ Reliability & Resilience

### ✅ Circuit Breaker
**Status**: Implemented via `github.com/sony/gobreaker` in `server/internal/platform/breaker` and `user.Service`.

- Wraps Google OAuth token exchange and userinfo API endpoints.
- Fast-fails with HTTP 503 `apperr.ServiceUnavailable` when external Google auth services degrade.

---

### ❌ Transient DB Query Retries
**Status**: DB connection startup retry exists in `migration.go`, but runtime queries do not retry.

**Missing**:
- No automatic retry with exponential backoff on transient PostgreSQL network dropouts or deadlock errors (`40P01`).

---

### ✅ Request Timeout Propagation
**Status**: Implemented via `RequestTimeout(10 * time.Second)` middleware in `server/internal/platform/middleware/timeout.go` and context error mapping in `apperr.MapDBError`.

- Enforces per-request context deadlines across DB queries, Redis calls, and HTTP handlers.
- Automatically maps `context.DeadlineExceeded` to HTTP 504 `GatewayTimeout`.

---

### ✅ Transactional Outbox Pattern & Event Streaming
**Status**: Implemented transactional `outbox_events` table, NATS JetStream event bus (`platform/eventbus`), and background outbox worker (`platform/outbox`).

- Asynchronously processes analytics click events without adding DB latency to the HTTP redirection path.
- Pluggable `EventPublisher` interface allows switching event brokers seamlessly.

---

## ⚡ Performance & Caching

### ✅ Redis Cache-Aside & Automatic Cache Invalidation
**Status**: Implemented via `github.com/redis/go-redis/v9` in `server/internal/platform/cache/redis.go`, `server/internal/url/service.go`, and `server/internal/admin/service.go`.

- **Short URL lookup cache** (`url:code:<code proposal> → URLResponse`).
- **Invalidation Triggers**:
  - `Update`: Deletes cache key on short URL update.
  - `Delete`: Deletes cache key on soft-deletion.
  - `Restore`: Deletes cache key on URL restoration.
  - `DeactivateExpiredURLs`: Background ticker fetches deactivated short codes from DB and invalidates their Redis cache keys.
  - `ForceDeleteURL`: Admin force-delete invalidates Redis cache entry immediately.

---

### ✅ CDN / Edge Cache-Control Headers
**Status**: Configured in `server/internal/url/redirect_handler.go`.

- Sets HTTP `Cache-Control` header on redirect responses (`public, max-age=300, s-maxage=3600`) to support Edge / CDN node caching (Cloudflare, Fastly).

---

### ✅ Database Index Optimization
**Status**: Migration `000002_optimize_indexes.up.sql` created and verified.

- Composite index `idx_url_analytics_url_clicked` on `url_analytics (url_id, clicked_at DESC)`.
- PostgreSQL `pg_trgm` extension and GIN trigram indexes on `short_urls(title)` and `short_urls(original_url)` for substring search (`ILIKE`).

---

## 🗄️ Database & Data Layer

### ✅ Soft Deletes & Restoration
**Status**: Implemented migration `000003_add_soft_deletes.up.sql` (`deleted_at TIMESTAMPTZ`) and `POST /api/v1/urls/{id}/restore` endpoint.

- `DeleteShortURL` sets `deleted_at = NOW(), is_active = FALSE`, preserving click history.
- `RestoreShortURL` clears `deleted_at` and reactivates short URLs.

---

### ❌ Database Read Replicas
**Status**: Single connection pool pointing at primary PostgreSQL database.

**Missing**:
- No read/write pool splitting (writes to primary, read queries to read replicas).
- No `pgBouncer` connection pooler configured in front of PostgreSQL for high concurrency.

---

### ❌ Database Backup & Disaster Recovery
**Status**: No automated database backups scripted.

**Missing**:
- No `pg_dump` backup cron job or WAL archiving setup in `compose.yml`.
- No point-in-time recovery (PITR) documentation.

---

## 🏗️ Architecture & Code Quality

### ✅ Decoupled Domain Events
**Status**: Implemented pluggable `EventPublisher` interface in `server/internal/platform/eventbus/eventbus.go` and `OutboxWorker` in `server/internal/platform/outbox/outbox_worker.go`.

- Publishes domain events (`click.recorded`, `outbox_events`) to NATS JetStream or memory fallback without coupling domain modules.

---

### ✅ Admin Backoffice API
**Status**: Implemented RBAC middleware (`RequireRole("admin")`) in `server/internal/platform/middleware/role.go` and `admin` domain package in `server/internal/admin`.

- Protected `/api/v1/admin` endpoints:
  - `GET /api/v1/admin/users`: Paginated user list and search.
  - `PUT /api/v1/admin/users/{id}/suspend`: Suspend / unsuspend user accounts.
  - `DELETE /api/v1/admin/urls/{id}`: Admin force-delete short URLs with cache invalidation.
  - `GET /api/v1/admin/stats`: Aggregate system statistics.

---

## 🧪 Testing

### ❌ Unit Tests for Services (Mocked DB)
**Status**: Integration (E2E) tests cover full flows, but unit tests with mocked `db.Store` are missing.

**Missing**:
- `db.MockStore` using `gomock` or `testify/mock` to test business services in isolation.

---

### ✅ Benchmark Tests
**Status**: Implemented Go benchmark suite (`make benchmark`).

- Benchmark results: JWT verification (~6.6 µs/op), Base62 code generation (~2.0 µs/op), SyncMap lookup (~1.0 µs/op).

---

### ✅ Integration & E2E Testing
**Status**: Implemented suite under `server/internal/e2e` using `testcontainers-go` and `postgres:18-alpine` (`make test-integration`).

---

### ✅ Load & Stress Testing
**Status**: Implemented k6 test suite in `scripts/loadtest/` directory (`make loadtest-smoke`, `make loadtest-load`, `make loadtest-stress`).

---

## 🚀 Deployment & Infrastructure

### ❌ Kubernetes Manifests / Helm Chart
**Status**: Only `compose.yml` and `Dockerfile` exist.

**Missing**:
- No Kubernetes `Deployment`, `Service`, `Ingress`, or `HorizontalPodAutoscaler` manifests.
- No `readinessProbe` / `livenessProbe` definitions in container spec.

---

### ✅ CI Pipeline (Continuous Integration)
**Status**: Implemented via [.github/workflows/ci.yml](file://.github/workflows/ci.yml).

- Runs `golangci-lint`, unit tests (`go test ./...`), and integration tests (`go test -tags=integration ./...`) on every `push` and `pull_request` to `main`.

---

### ❌ CD Pipeline (Continuous Deployment)
**Status**: No automated CD pipeline.

**Missing**:
- No automated Docker image build & push to container registries (GHCR / DockerHub).
- No automated deployment triggers.

---

## 📦 Developer Experience

### ✅ Pre-commit Hooks & Air Live Reload
**Status**: Implemented via `.pre-commit-config.yaml`, `.lefthook.yml`, `.air.toml`, `make setup-hooks`, and `make dev`.

---

### ✅ Mock Seed Script
**Status**: Implemented via `server/cmd/seed/main.go` and `make seed`.

---

## 🎁 Product Features

### ✅ Inactive & Invalid URL Handling Page
**Status**: Implemented in `server/internal/url/redirect_handler.go` and `web/src/features/urls/pages/InvalidURLPage.jsx`.

- Browser requests (`Accept: text/html`) for inactive, expired, or missing URLs are redirected to `/invalid-url?code={code}&reason={inactive|expired|not_found}`.
- Frontend page styled using clean shadcn UI `Card` and `Button` components matching the workspace design.

---

### ✅ Background Expiration Worker
**Status**: Implemented in `server/internal/url/service.go` (`DeactivateExpiredURLs`).

- Periodically deactivates expired links and clears them from Redis cache.

---

### ✅ Safety Preview & QR Codes
**Status**: Implemented `GET /{code}/preview`, `GET /{code}+`, and QR code endpoints (`GET /{code}/qr` and `GET /api/v1/urls/{id}/qr`).

---

### ❌ Custom Domain Routing & Webhooks
**Missing**:
- No multi-tenant custom domain routing (e.g. `links.mybrand.com/code`).
- No webhooks or email notifications on click thresholds or link expiry.

---

## 📊 Priority Summary

| Priority | Category | Item | Status |
|:---:|:---|:---|:---:|
| 🔴 **Critical** | Performance | Redis caching & cache invalidation on delete/deactivate | ✅ Completed |
| 🔴 **Critical** | Reliability | Transactional outbox & async click recording | ✅ Completed |
| 🔴 **Critical** | Security | Logout endpoint & session revocation | ✅ Completed |
| 🔴 **Critical** | Security | Brute-force email lockout & rate limiting | ✅ Completed |
| 🔴 **Critical** | Product | Inactive/Invalid URL frontend page & redirect | ✅ Completed |
| 🔴 **Critical** | Deployment | CI Pipeline via GitHub Actions | ✅ Completed |
| 🟠 **High** | Observability | Distributed Tracing (OpenTelemetry) | ❌ Missing |
| 🟠 **High** | Observability | Metrics instrumentation & `/metrics` endpoint | ❌ Missing |
| 🟠 **High** | Testing | Service unit tests with mocked DB (`gomock`) | ❌ Missing |
| 🟠 **High** | Deployment | Continuous Deployment (CD) & K8s/Helm manifests | ❌ Missing |
| 🟡 **Medium** | Database | DB Read Replicas & Connection Pooling (`pgBouncer`) | ❌ Missing |
| 🟡 **Medium** | Database | Automated DB backups & Point-in-Time Recovery | ❌ Missing |
| 🟡 **Medium** | Security | Centralized Secrets Manager integration | ❌ Missing |
| 🟢 **Low** | Features | Custom multi-tenant domain support | ❌ Missing |
| 🟢 **Low** | Features | Webhook & email notification delivery | ❌ Missing |
