# URL Shortener API

<p align="center">
  <a href="https://github.com/semmidev/url-shortener/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/semmidev/url-shortener/ci.yml?branch=main&label=CI&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/semmidev/url-shortener/actions/workflows/security.yml"><img src="https://img.shields.io/github/actions/workflow/status/semmidev/url-shortener/security.yml?branch=main&label=Security&style=flat-square" alt="Security Status"></a>
  <a href="https://github.com/semmidev/url-shortener/actions/workflows/cd.yml"><img src="https://img.shields.io/github/actions/workflow/status/semmidev/url-shortener/cd.yml?label=CD&style=flat-square" alt="CD Status"></a>
  <a href="https://github.com/semmidev/url-shortener/releases"><img src="https://img.shields.io/github/v/release/semmidev/url-shortener?style=flat-square&color=blue" alt="Latest Release"></a>
  <a href="https://github.com/semmidev/url-shortener/blob/main/LICENSE"><img src="https://img.shields.io/github/license/semmidev/url-shortener?style=flat-square&color=gray" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.27.0-00ADD8?style=flat-square" alt="Go">
  <img src="https://img.shields.io/badge/Chi-v5.3.0-00ADD8?style=flat-square" alt="Chi Router">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/AuthZ-Casbin-2496ED?style=flat-square" alt="Casbin RBAC">
  <img src="https://img.shields.io/badge/Concurrency-destel%2Frill-FF6C37?style=flat-square" alt="destel/rill">
  <img src="https://img.shields.io/badge/Queue-Asynq_Redis-DC382D?style=flat-square" alt="Asynq">
</p>

A high-performance, enterprise-grade Multi-Tenant SaaS URL Shortener REST API written in Go using **Modular Monolith** architecture, **Casbin RBAC Decision Engine**, **destel/rill concurrency pipelines**, **Asynq Redis Worker Queues**, and **PostgreSQL 18**. Features embedded React 19 SPA frontend single-binary distribution, Scalar & Swagger interactive API documentation, automated database migrations, SSRF prevention, structured wide-event logging, transactional outbox event streaming, and multi-layered CI/CD security pipelines.

---

## Table of Contents
- [URL Shortener API](#url-shortener-api)
  - [Table of Contents](#table-of-contents)
  - [Quick Start \& Setup Guide](#quick-start--setup-guide)
    - [1. Prerequisites](#1-prerequisites)
    - [2. Run Application Locally](#2-run-application-locally)
    - [3. Access Interactive API References](#3-access-interactive-api-references)
  - [System Architecture \& Data Flow](#system-architecture--data-flow)
    - [Multi-Tenant SaaS Architecture Diagram](#multi-tenant-saas-architecture-diagram)
    - [Observability Architecture \& Telemetry Pipeline](#observability-architecture--telemetry-pipeline)
    - [Observability Mechanisms \& Components Breakdown](#observability-mechanisms--components-breakdown)
      - [Technical Highlights \& Design Principles:](#technical-highlights--design-principles)
  - [Enterprise Security \& CI/CD Pipelines](#enterprise-security--cicd-pipelines)
    - [Key Security Safeguards](#key-security-safeguards)
  - [Makefile Commands](#makefile-commands)
  - [Architectural \& Code Style Decisions (ADRs)](#architectural--code-style-decisions-adrs)
  - [Release \& Deployment Workflow](#release--deployment-workflow)
    - [How to Trigger a New Release (Docker Hub Image \& GitHub Release)](#how-to-trigger-a-new-release-docker-hub-image--github-release)
  - [Implementing a New Feature (Workflow Guide)](#implementing-a-new-feature-workflow-guide)
    - [Step 1: Database Migration](#step-1-database-migration)
    - [Step 2: SQL Query Definition \& SQLC Generation](#step-2-sql-query-definition--sqlc-generation)
    - [Step 3: Domain Module \& Service Implementation](#step-3-domain-module--service-implementation)
    - [Step 4: Wire Dependencies \& Generate Swagger Docs](#step-4-wire-dependencies--generate-swagger-docs)
    - [Step 5: Verification \& Testing](#step-5-verification--testing)
  - [Testing Guide](#testing-guide)
  - [Environment Variables Reference](#environment-variables-reference)

---

## Quick Start & Setup Guide

### 1. Prerequisites
- **Go**: `v1.22+` (or `v1.27.0`)
- **Docker** / **Podman**: Required for local PostgreSQL & Redis containers and Testcontainers integration testing.
- **Make**: For running build, test, migration, and development commands.

### 2. Run Application Locally

```bash
# 1. Clone the repository and navigate into project directory
git clone https://github.com/semmidev/url-shortener.git
cd url-shortener

# 2. Copy environment variable template to .env
cp .env.example .env

# 3. Copy pgbouncer userlist template to userlist
cp ./server/db/pgbouncer/userlist.txt.example ./server/db/pgbouncer/userlist.txt

# 4. Start App stack and optional Monitoring stack via Docker Compose
make docker-up          # Start core App stack (compose.yml)
make monitoring-up      # (Optional) Start Observability/Monitoring stack (compose.monitoring.yml)

# Or start both stacks together:
# make up-all

# 5. Stream logs for App services
make docker-logs

# 6. Stop containers
make docker-down
make monitoring-down    # Or 'make down-all' to stop both
```

### 3. Access Interactive API References
Once the server is running (`http://localhost:8080`):
- **Modern Scalar API Reference UI**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Interactive Swagger UI**: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

---

## System Architecture & Data Flow

### Multi-Tenant SaaS Architecture Diagram

```mermaid
graph TD
    Client["Client / Web SPA / Mobile"] -->|HTTP Requests| Router["Chi Router"]

    subgraph MiddlewareStack["Middleware Stack"]
        MW["CORS • Secure Headers • Rate Limiter • JWT Auth • Tenant Context • Wide Slog"]
    end

    Router --> MW
    MW --> Handlers["HTTP Handlers Layer<br/>(Tenant • User • URL • Redirect • Analytics • SPA)"]

    subgraph BusinessLogic["Core Business Logic Services"]
        TenantSvc["TenantService (SaaS Multi-Tenant)"]
        UserSvc["UserService"]
        URLSvc["URLService (SSRF Safe)"]
        AnalyticsSvc["AnalyticsService"]
    end

    Handlers --> BusinessLogic

    subgraph PlatformInfrastructure["Engine & Infrastructure Layer"]
        Casbin["Casbin RBAC Engine"]
        JWTMaker["JWT Token Maker"]
        RedisCache["Redis L1 Cache"]
        RillPipeline["destel/rill Concurrency"]
        TaskDistributor["Asynq Redis Task Queue"]
        SQLCStore["SQLC Store (PostgreSQL DAO)"]
    end

    BusinessLogic --> Casbin
    BusinessLogic --> JWTMaker
    BusinessLogic --> RedisCache
    BusinessLogic --> RillPipeline
    BusinessLogic --> TaskDistributor
    BusinessLogic --> SQLCStore

    subgraph Persistence["Data Storage Layer"]
        PostgreSQL[("PostgreSQL 18 Database")]
        RedisDB[("Redis Store")]
    end

    SQLCStore --> PostgreSQL
    RedisCache --> RedisDB
    TaskDistributor -.->|Enqueue Tasks| RedisDB
```

### Observability Architecture & Telemetry Pipeline

Observability Stack di-built-in secara native berbasis **OpenTelemetry (OTEL)**, **Grafana Alloy**, **Grafana Tempo** (Distributed Tracing), **Grafana Loki** (Log Aggregation), **Prometheus** (Metrics Collection), dan **Grafana** (Visualization & Monitoring).

```mermaid
graph TD
    subgraph Applications["Application Runtime"]
        API["url-shortener-api (HTTP Server)"]
        Worker["url-shortener-worker (Background Worker)"]
    end

    subgraph Exporters["Telemetry Instrumentation"]
        OTEL["OpenTelemetry Go SDK (Traces)"]
        PromExporter["Prometheus Scrape Endpoint (/metrics)"]
        LokiLogger["Non-Blocking Async Loki Logger (slog)"]
    end

    API --> OTEL
    API --> PromExporter
    API --> LokiLogger
    Worker --> OTEL
    Worker --> LokiLogger

    subgraph CollectorLayer["Collectors & Ingestion"]
        Alloy["Grafana Alloy Collector"]
    end

    OTEL -->|"OTLP gRPC (:4317)"| Alloy
    PromExporter -.->|"HTTP Scrape (:8080/metrics)"| Alloy

    subgraph StorageBackends["Storage Backends"]
        Tempo[("Grafana Tempo (Traces)")]
        Prometheus[("Prometheus TSDB (Metrics)")]
        Loki[("Grafana Loki (Logs)")]
    end

    Alloy -->|"OTLP gRPC"| Tempo
    Alloy -->|"Remote Write"| Prometheus
    LokiLogger -->|"HTTP Batch (:3100)"| Loki

    subgraph Visualization["Visualization & Monitoring"]
        Grafana["Grafana Unified Dashboard (:3000)"]
    end

    Grafana --> Tempo
    Grafana --> Prometheus
    Grafana --> Loki
    Tempo -.->|"Trace-to-Log Correlation via trace_id"| Loki
```

### Observability Mechanisms & Components Breakdown

| Komponen | Telemetry Signal | Mekanisme Exporter & Collector | Storage & Backend | Port / Endpoint | Key Attributes & Correlation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenTelemetry Go SDK** | **Traces** | OTLP gRPC Exporter dengan dynamic sampler (`OTEL_SAMPLING_RATIO`). Auto-instrumentation pada Middleware HTTP, Service Layer (`telemetry.StartSpan`), Redis, & Worker. | **Grafana Tempo** via Grafana Alloy | `4317` (gRPC OTLP) | `trace_id`, `span_id`, `tenant_id`, `user_id`, `http.status_code`, `error` |
| **slog + Custom Loki Handler** | **Structured Logs** | Asynchronous ring-buffered `LokiHandler` (`server/internal/platform/logger/loki.go`). Batching non-blocking HTTP POST request ke Loki. | **Grafana Loki** | `3100` (`/loki/api/v1/push`) | `app`, `env`, `level`, `trace_id`, `span_id`, `tenant_id`, `user_id` |
| **Prometheus Exporter** | **Metrics** | `/metrics` HTTP endpoint exposing Go runtime, HTTP request latency histograms, DB connection pool, & Asynq queue stats. | **Prometheus TSDB** via Alloy Scraper | `8080/metrics` & `9090` | `http_requests_total`, `http_request_duration_seconds`, `go_goroutines` |
| **Grafana Provisioning** | **Dashboards** | Pre-configured Data Sources dengan fixed UID (`prometheus`, `tempo`, `loki`) & auto-imported JSON Dashboards. | **Grafana UI** | `3000` | Unified trace-to-log navigation & dashboard panels |

#### Technical Highlights & Design Principles:
1. **Zero-Latency Impact Logging**: Log dikirim secara terpisah melalui buffered channel (default buffer `2048` entries) di goroutine latar belakang (`LokiHandler`). Kegagalan koneksi ke Loki tidak akan pernah mengganggu atau memperlambat HTTP response ke client.
2. **End-to-End Tracing (Full-Stack Observability)**: Tracing tidak hanya berada di level HTTP Middleware, melainkan merambah ke Service Layer (`TenantService`, `UserService`, `URLService`, `AnalyticsService`), Redis Caching layer, hingga background worker (`Asynq`).
3. **Trace-Log Correlation**: Setiap log entry otomatis menangkap `trace_id` dan `span_id` dari `context.Context`. Di Grafana, pengguna dapat men-klik ID trace di Grafana Tempo untuk langsung melompat ke log terkait di Grafana Loki, dan sebaliknya.


---

## Enterprise Security & CI/CD Pipelines

This repository implements a multi-layered security & quality audit pipeline:

| Pipeline / Tool | Category | Action / Configuration File |
| :--- | :--- | :--- |
| **CodeQL SAST v4** | Static Application Security Testing | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) |
| **GitLeaks** | Secret & Token Detection | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **Govulncheck** | Go Dependency Vulnerability Scanner | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **Hadolint** | Dockerfile Security & Best Practices Linter | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **Trivy** | Container Image & Artifact Vulnerability Scanner | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **golangci-lint** | Static Code Quality & Deprecation Checker | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

### Key Security Safeguards
- **Multi-Tenant SaaS & RBAC Isolation**: Fine-grained Casbin decision engine authorizer enforcing per-tenant role permissions (`owner`, `admin`, `member`, custom roles).
- **SSRF Protection**: URL creation enforces scheme validation (`http`, `https`) and strictly rejects loopback IPs (`127.0.0.1`, `::1`), private CIDR ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and `localhost` hostnames.
- **Client IP Resolution**: Safe `web.GetClientIP(r)` header extraction (`CF-Connecting-IP`, `X-Forwarded-For`, `X-Real-IP`) to prevent IP spoofing attacks.
- **Unbounded Goroutine Offloading**: Asynq Redis Task Queue offloads asynchronous analytics processing safely under high concurrency.
- **HTTP Hardening**: Strict CSP headers (`connect-src`), anti-caching headers on error responses (`Cache-Control: no-store`), and isolated management server endpoints.

---

## Makefile Commands

```bash
make docker-up         # Start core app stack via compose.yml (auto-creates external network)
make docker-down       # Stop core app stack via compose.yml
make docker-logs       # Stream app container logs
make monitoring-up     # Start observability & monitoring stack via compose.monitoring.yml
make monitoring-down   # Stop observability & monitoring stack
make monitoring-logs   # Stream monitoring container logs
make up-all            # Start both App and Monitoring stacks
make down-all          # Stop both App and Monitoring stacks
make seed              # Seed database with sample users, short URLs, and analytics events
make setup-hooks       # Install pre-commit git hooks
make build             # Build production static binary in bin/api
make lint              # Run golangci-lint code analysis (0 issues requirement)
make test              # Run unit tests only (go test ./...)
make test-integration  # Run E2E integration tests (-tags=integration)
make test-all          # Run all unit and integration tests
make swagger           # Generate Swagger OpenAPI documentation schemas
make sqlc              # Generate SQLC database code
make new_migration name=add_user_index # Create a new SQL migration pair (up & down)
make migrateup         # Apply all pending database migrations up
make migrateup1        # Apply 1 step of database migration up
make migratedown       # Rollback all database migrations down
make migratedown1      # Rollback 1 step of database migration down
make createdb          # Create urlshortener database via container
make dropdb            # Drop urlshortener database via container
make clean             # Clean build artifacts
```

---

## Architectural & Code Style Decisions (ADRs)

All major architectural and code style decisions are formally documented in our [Architecture Decision Records (`docs/adr`)](docs/adr/README.md).

| ADR | Summary | Link |
| :--- | :--- | :--- |
| **backend-0001** | Modular Monolith Architecture | [Read Record](docs/adr/backend-0001-modular-monolith-architecture.md) |
| **backend-0002** | Uniform Service Signatures & DTO Encapsulation | [Read Record](docs/adr/backend-0002-uniform-service-method-signatures.md) |
| **backend-0003** | Structured Wide Event Logging (`log/slog`) | [Read Record](docs/adr/backend-0003-structured-wide-event-logging.md) |
| **backend-0004** | Secure Error Handling & Sensitive Masking | [Read Record](docs/adr/backend-0004-secure-error-handling-redaction.md) |
| **backend-0005** | Standardized JSON Responses & Error Codes | [Read Record](docs/adr/backend-0005-standardized-json-responses.md) |
| **backend-0006** | Universal Translator & Locale Input Validation | [Read Record](docs/adr/backend-0006-locale-validation-universal-translator.md) |
| **backend-0007** | Modern Scalar API Reference UI & Swagger | [Read Record](docs/adr/backend-0007-scalar-api-reference-swagger.md) |
| **backend-0008** | Database Error Mapping & Atomic Transactions | [Read Record](docs/adr/backend-0008-db-error-mapping-atomic-transactions.md) |
| **backend-0009** | Automated Database Migrations & Retry Resiliency | [Read Record](docs/adr/backend-0009-automated-migrations-retry-resiliency.md) |
| **backend-0010** | Configurable Graceful Shutdown | [Read Record](docs/adr/backend-0010-graceful-shutdown.md) |
| **backend-0011** | Tiered Rate Limiting by Route Classification | [Read Record](docs/adr/backend-0011-tiered-rate-limiting.md) |
| **backend-0012** | Redis Cache-Aside & Edge Cache-Control Headers | [Read Record](docs/adr/backend-0012-redis-cache-aside-edge-cache-control.md) |
| **backend-0013** | Product Features (Cleanup, Preview, QR, Dashboard Analytics) | [Read Record](docs/adr/backend-0013-product-features-cleanup-preview-qr-dashboard.md) |
| **backend-0014** | Multi-Instance State Management with Redis | [Read Record](docs/adr/backend-0014-multi-instance-redis-state.md) |
| **backend-0015** | Circuit Breaker Pattern for External Dependencies | [Read Record](docs/adr/backend-0015-circuit-breaker-external-calls.md) |
| **backend-0016** | Database Soft Deletes for Short URLs | [Read Record](docs/adr/backend-0016-soft-deletes.md) |
| **backend-0017** | Transactional Outbox Pattern & NATS JetStream Event Bus | [Read Record](docs/adr/backend-0017-outbox-pattern-nats-event-bus.md) |
| **backend-0018** | Request Timeout Propagation & Deadline Handling | [Read Record](docs/adr/backend-0018-request-timeout-propagation.md) |
| **backend-0019** | Admin API & Role-Based Access Control (RBAC) | [Read Record](docs/adr/backend-0019-admin-api-backoffice-rbac.md) |
| **backend-0020** | Comprehensive Cache Invalidation Across Triggers | [Read Record](docs/adr/backend-0020-comprehensive-cache-invalidation.md) |
| **backend-0021** | Prometheus Metrics Instrumentation & `/metrics` Scrape Endpoint | [Read Record](docs/adr/backend-0021-prometheus-metrics-instrumentation.md) |
| **backend-0022** | Go 1.27 Upgrade & Generic Methods Integration | [Read Record](docs/adr/backend-0022-go-127-upgrade-and-generic-methods.md) |
| **backend-0023** | Strict API-Only HTTP Request Logging Filter | [Read Record](docs/adr/backend-0023-strict-api-only-http-request-logging-filter.md) |
| **backend-0024** | Casbin Decision Engine Authorization Architecture | [Read Record](docs/adr/backend-0024-casbin-decision-engine-authorization.md) |
| **backend-0025** | Multi-Tenant SaaS Architecture Transformation | [Read Record](docs/adr/backend-0025-multi-tenant-saas-architecture.md) |
| **frontend-0001** | Single-Binary SPA Embedding with Go `embed.FS` | [Read Record](docs/adr/frontend-0001-single-binary-spa-embedding.md) |
| **frontend-0002** | Browser HTML Navigation Redirection for Inactive/Expired URLs | [Read Record](docs/adr/frontend-0002-browser-html-navigation-redirection.md) |
| **frontend-0003** | Global Progress Loading Indicator & Debounced Search Inputs | [Read Record](docs/adr/frontend-0003-global-progress-indicator-and-debounced-search.md) |
| **frontend-0004** | Comprehensive i18n Internationalization & Language Toggle | [Read Record](docs/adr/frontend-0004-i18n-internationalization-and-language-toggle.md) |
| **frontend-0005** | Bun Runtime, Package Manager, & Vite Bundling | [Read Record](docs/adr/frontend-0005-bun-runtime-package-manager-and-vite-bundling.md) |
| **infra-0001** | Developer Experience & Tooling (Air, Pre-commit, Seed) | [Read Record](docs/adr/infra-0001-developer-experience-tooling.md) |
| **infra-0002** | Release-Driven CD & Semantic Versioning Automation | [Read Record](docs/adr/infra-0002-release-driven-cd-and-semver-automation.md) |
| **infra-0003** | Asynq Background Task Worker & Deduplication | [Read Record](docs/adr/infra-0003-asynq-background-worker-and-task-deduplication.md) |
| **infra-0004** | PgBouncer Connection Pooling & `pgx/v5` Compatibility | [Read Record](docs/adr/infra-0004-pgbouncer-connection-pooling.md) |
| **security-0001** | HTTP Security Headers Hardening & Route CSP | [Read Record](docs/adr/security-0001-http-security-headers-hardening-csp.md) |
| **security-0002** | Security Audit Logging | [Read Record](docs/adr/security-0002-security-audit-logging.md) |
| **security-0003** | OAuth Account Linking & Password Governance | [Read Record](docs/adr/security-0003-oauth-account-linking-and-password-governance.md) |
| **security-0004** | Dedicated Internal Management Server Isolation | [Read Record](docs/adr/security-0004-internal-management-server-isolation.md) |
| **testing-0001** | Benchmark Testing & k6 Performance Engineering | [Read Record](docs/adr/testing-0001-benchmarks-and-k6-load-testing.md) |

---

## Release & Deployment Workflow

This project enforces a **Release-Driven CI/CD Strategy** following industry best practices:

- **CI (`.github/workflows/ci.yml`)**: Runs linting (`golangci-lint`), unit tests, and integration tests on every `push` and `pull_request` to `main` / `master`.
- **Security Audit (`.github/workflows/security.yml` & `codeql.yml`)**: Runs CodeQL SAST (v4), GitLeaks, Govulncheck, Hadolint, and Trivy image scanning.
- **CD (`.github/workflows/cd.yml`)**: Triggers **ONLY when a Git release tag (`v*`) is pushed**. Builds and pushes multi-architecture Docker images to Docker Hub with Semantic Versioning tags (`1.12.3`, `1.12`, `1`, `latest`).
- **Release Automation (`.goreleaser.yaml` & `.github/workflows/release.yml`)**: Triggers on Git tag push (`v*`). Builds cross-platform static Go binaries (embedding compiled React SPA assets), generates changelogs from Conventional Commits, and publishes artifacts to **GitHub Releases**.

### How to Trigger a New Release (Docker Hub Image & GitHub Release)

To publish a new production version (e.g. `v1.12.3`):

```bash
# 1. Create a semantic versioning Git tag locally
git tag -a v1.12.3 -m "v1.12.3 Rilis Keamanan, Refactoring Authorizer, dan Otomasi Multi-Tenant SaaS"

# 2. Push the tag to GitHub to trigger CI/CD & GoReleaser workflows
git push origin v1.12.3
```

Once pushed, GitHub Actions automatically:
1. Runs CI & Security tests.
2. Generates GitHub Release binaries (`.tar.gz`, `.zip`), checksums, and changelog notes.
3. Builds and pushes versioned container images (`username/repository:1.12.3`, `1.12`, `1`, `latest`) to Docker Hub.

---

## Implementing a New Feature (Workflow Guide)

When adding a new feature or domain module to the backend API, follow these standard steps:

### Step 1: Database Migration
1. Generate new migration files in `server/db/migration/`:
   ```bash
   make new_migration name=add_feature_table
   ```
2. Write clean DDL SQL statements inside generated `.up.sql` and `.down.sql` files.

### Step 2: SQL Query Definition & SQLC Generation
1. Add type-safe SQL queries to `server/db/query/` (e.g. `server/db/query/feature.sql`).
2. Run SQLC code generation:
   ```bash
   make sqlc
   ```
3. SQLC automatically generates type-safe Go structs and query methods under `server/db/sqlc/`.

### Step 3: Domain Module & Service Implementation
1. Create or update domain files under `server/internal/<module>/`:
   - `dto.go`: Define DTO Request & Response structs with `go-playground/validator` tags (`validate:"required"`). Implement `Validate() error` using `validator.Check(r)`.
   - `domain.go`: Define core domain entities, custom domain types, and constants.
   - `service.go`: Implement business logic following the uniform signature pattern:
     $$\text{func (s *Service) FeatureName(ctx context.Context, req RequestStruct) (*ResponseStruct, error)}$$
     - Wrap DB calls using `apperr.MapDBError(err, "not found message", "conflict message")`.
     - Use `s.store.ExecTx(ctx, func(q *db.Queries) error { ... })` for multi-query atomic database operations.
   - `http.go`: Create HTTP handlers with Swaggo comments and mount routes onto Chi router. Decode bodies using `web.Decode(r, &req)` and return standard responses using `web.JSON` or `web.Error`.

### Step 4: Wire Dependencies & Generate Swagger Docs
1. Update `server/internal/app/app.go` (`BuildRouter`) to initialize the new domain service and handler, mounting its routes onto the router.
2. Regenerate Open API documentation:
   ```bash
   make swagger
   ```

### Step 5: Verification & Testing
1. Add unit tests in domain package (e.g. `server/internal/<module>/<module>_test.go`).
2. Add E2E integration test scenarios to `server/internal/e2e/` within the test suite.
3. Run verification suite:
   ```bash
   make test              # Run unit tests
   make test-integration  # Run E2E integration tests against Testcontainers
   ```

---

## Testing Guide

```bash
# Run unit tests only (ignores integration build tags automatically)
make test

# Run integration tests using Testcontainers
make test-integration

# Run all unit and integration tests
make test-all
```

---

## Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | `string` | `development` | Application environment (`development`, `production`, `test`). |
| `APP_BASE_URL` | `string` | `http://localhost:8080` | Public base URL of the service. |
| `MIGRATION_URL` | `string` | `file://server/db/migration` | Migration files directory location. |
| `APP_LOCALE` | `string` | `id` | Locale for validation messages (`id`, `en`). |
| `LOG_LEVEL` | `string` | `debug` | Slog log level threshold (`debug`, `info`, `warn`, `error`). |
| `LOG_FORMAT` | `string` | `text` | Slog output format (`text`, `json`). |
| `LOG_ADD_SOURCE` | `bool` | `true` | Include caller `file:line` in log records (`true`, `false`). |
| `SERVER_ADDRESS` | `string` | `0.0.0.0:8080` | HTTP server listening address. |
| `SERVER_READ_TIMEOUT` | `duration` | `15s` | HTTP server read timeout. |
| `SERVER_WRITE_TIMEOUT` | `duration` | `15s` | HTTP server write timeout. |
| `SERVER_IDLE_TIMEOUT` | `duration` | `60s` | HTTP server keep-alive idle timeout. |
| `SERVER_SHUTDOWN_TIMEOUT` | `duration` | `10s` | Graceful shutdown timeout window. |
| `RATE_LIMIT_AUTH_REQUESTS` | `int` | `10` | Auth endpoints request limit per window. |
| `RATE_LIMIT_AUTH_WINDOW` | `duration` | `1m` | Auth endpoints rate limit window. |
| `RATE_LIMIT_API_REQUESTS` | `int` | `100` | General API endpoints request limit per window. |
| `RATE_LIMIT_API_WINDOW` | `duration` | `1m` | General API endpoints rate limit window. |
| `RATE_LIMIT_PUBLIC_REQUESTS` | `int` | `300` | Public redirection request limit per window. |
| `RATE_LIMIT_PUBLIC_WINDOW` | `duration` | `1m` | Public redirection rate limit window. |
| `DB_SOURCE` | `string` | `postgres://postgres:postgres@127.0.0.1:5432/urlshortener?sslmode=disable` | PostgreSQL connection string DSN. |
| `DB_MAX_CONNS` | `int32` | `25` | Maximum database pool connections. |
| `DB_MIN_CONNS` | `int32` | `5` | Minimum idle database pool connections. |
| `JWT_SECRET` | `string` | `super-secret-32-byte-key-for-jwt-signing!` | Secret key for signing JWT tokens. |
| `JWT_ACCESS_TOKEN_DURATION` | `duration` | `15m` | Access token expiration duration. |
| `JWT_REFRESH_TOKEN_DURATION` | `duration` | `168h` | Refresh token expiration duration (7 days). |
