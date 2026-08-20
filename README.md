# URL Shortener API

A clean, modern, high-performance URL Shortener REST API backend written in Go using **Modular Monolith** architecture, **Go-Chi**, and **PostgreSQL 18**. Features interactive Scalar API Reference UI & Swagger documentation, automatic database migrations, structured wide-event logging, multi-language input validation, tiered rate limiting, and containerized testing support.

### 📸 Previews

#### 📊 UI
![Dashboard Preview](docs/ss/dashboard.png)

#### 📖 Scalar API Documentation Reference UI
![API Documentation Preview](docs/ss/docs.png)

---

## 📋 Table of Contents
- [🚀 Quick Start & Setup Guide](#-quick-start--setup-guide)
- [🏗️ System Architecture & Data Flow](#️-system-architecture--data-flow)
- [🛠️ Makefile Commands](#️-makefile-commands)
- [🏗️ Architectural & Code Style Decisions (ADRs)](#-architectural--code-style-decisions-adrs)
- [🛠️ Implementing a New Feature (Workflow Guide)](#️-implementing-a-new-feature-workflow-guide)
- [🧪 Testing Guide](#-testing-guide)
- [⚙️ Environment Variables Reference](#️-environment-variables-reference)

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- **Go**: `v1.22+` (or latest `v1.26`)
- **Docker** / **Podman**: Required for local PostgreSQL database container and Testcontainers E2E testing.
- **Make**: Executing build, test, and container scripts.

### 2. Run Application Locally

```bash
# 1. Clone the repository and navigate into project directory
git clone https://github.com/semmidev/url-shortener.git
cd url-shortener

# 2. Copy environment variable template to .env
cp .env.example .env

# 3. Start local PostgreSQL container (via compose.dev.yml)
make up-dev

# 4. Run backend API server (runs database migrations automatically on startup)
make run

# 5. Stop local PostgreSQL container
make down-dev
```

### 3. Access Interactive API References
Once the server is running (`http://localhost:8080`):
- **Modern Scalar API Reference UI**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Interactive Swagger UI**: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

---

## 🏗️ System Architecture & Data Flow

### High-Level Architecture Diagram (Modular Monolith Component Layering)

```mermaid
graph TD
    Client["Client / Web SPA / Mobile"] --> |HTTP Request| Router["Chi Router (HTTP Server)"]

    subgraph MiddlewareStack["Middleware Stack"]
        CORS["CORS Middleware"]
        SecureHeaders["Secure Headers"]
        RealIP["Real IP & Recovery"]
        Timeout["Request Timeout (10s)"]
        LoggerMW["Wide Event Logging"]
        RateLimiter["Redis Rate Limiter"]
        AuthMW["JWT Auth Middleware"]
        RoleMW["Role Admin Guard"]
    end

    Router --> MiddlewareStack

    subgraph Handlers["HTTP Handlers Layer"]
        RedirectH["RedirectHandler"]
        UserH["UserHandler"]
        URLH["URLHandler"]
        AnalyticsH["AnalyticsHandler"]
        AdminH["AdminHandler"]
        SPAH["Embedded SPA Handler"]
    end

    MiddlewareStack --> Handlers

    subgraph Services["Core Business Logic Layer"]
        UserSvc["UserService"]
        URLSvc["URLService"]
        AnalyticsSvc["AnalyticsService"]
        AdminSvc["AdminService"]
    end

    UserH --> UserSvc
    URLH --> URLSvc
    RedirectH --> URLSvc
    AnalyticsH --> AnalyticsSvc
    AdminH --> AdminSvc

    subgraph BackgroundWorkers["Background Workers"]
        OutboxWorker["Outbox Worker (Async Event Stream)"]
        CleanupWorker["URL Expiration Worker (Goroutine)"]
    end

    CleanupWorker -.-> URLSvc
    OutboxWorker -.-> AnalyticsH

    subgraph PlatformLayer["Platform & Infrastructure Layer"]
        JWTMaker["JWT Token Maker"]
        RedisCache["Redis Cache (L1 Cache & Rate Limit)"]
        EventPub["Event Publisher (NATS / InMemory)"]
        SQLCStore["SQLC Store (PostgreSQL DAO)"]
    end

    UserSvc --> JWTMaker
    UserSvc --> RedisCache
    UserSvc --> SQLCStore
    URLSvc --> RedisCache
    URLSvc --> SQLCStore
    AnalyticsSvc --> SQLCStore
    AdminSvc --> RedisCache
    AdminSvc --> SQLCStore

    OutboxWorker --> SQLCStore
    OutboxWorker --> EventPub

    subgraph DataStorage["Data Persistence Layer"]
        PostgreSQL[("PostgreSQL Database")]
        RedisDB[("Redis Store")]
        NATS[("NATS JetStream Broker")]
    end

    SQLCStore --> PostgreSQL
    RedisCache --> RedisDB
    EventPub --> NATS
```

### Redirection & Analytics Sequence Diagram (`GET /{code}`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / User Browser
    participant Chi as Chi Router & Middleware
    participant RedH as RedirectHandler
    participant URLSvc as URLService
    participant Redis as Redis Cache
    participant DB as PostgreSQL (SQLC)
    participant AsyncLog as Async Goroutine
    participant Analytics as Analytics Recorder

    User->>Chi: GET /{code}
    Chi->>Chi: Apply Rate Limiting & Wide Event Logging
    Chi->>RedH: Handled by Redirect(w, r)
    RedH->>URLSvc: GetByCode(shortCode)

    URLSvc->>Redis: Get("url:code:" + shortCode)
    alt Cache Hit (L1 Fast Path)
        Redis-->>URLSvc: Return Cached URL Data
    else Cache Miss (DB Lookup)
        URLSvc->>DB: Query GetURLByShortCode
        DB-->>URLSvc: Return DB Record
        URLSvc->>Redis: Set("url:code:" + shortCode, URLData, TTL)
    end

    URLSvc-->>RedH: Return Target Destination URL
    RedH-->>User: 307 Temporary Redirect (Location: target_url)

    par Async Background Logging (Non-blocking)
        RedH->>AsyncLog: Launch Goroutine (Click & Analytics)
        AsyncLog->>URLSvc: IncrementClickCount(urlID)
        AsyncLog->>DB: UPDATE click_count
        AsyncLog->>Analytics: RecordClick(urlID, IP, UserAgent, Referrer)
        Analytics->>DB: INSERT into url_analytics & outbox
    end
```

---

## 🛠️ Makefile Commands

```bash
make run               # Run backend API server locally
make dev               # Run backend API server locally with Air live hot-reload
make seed              # Seed database with sample users, short URLs, and analytics events
make setup-hooks       # Install pre-commit git hooks
make build             # Build production static binary in bin/api
make lint              # Run golangci-lint code analysis (0 issues requirement)
make up-dev            # Start local development infrastructure (PostgreSQL) via compose.dev.yml
make down-dev          # Stop local development infrastructure via compose.dev.yml
make logs-dev          # Stream local development infrastructure logs
make docker-up         # Start full stack production containers via compose.yml
make docker-down       # Stop full stack production containers via compose.yml
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

## 🏗️ Architectural & Code Style Decisions (ADRs)

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
| **frontend-0001** | Single-Binary SPA Embedding with Go `embed.FS` | [Read Record](docs/adr/frontend-0001-single-binary-spa-embedding.md) |
| **frontend-0002** | Browser HTML Navigation Redirection for Inactive/Expired URLs | [Read Record](docs/adr/frontend-0002-browser-html-navigation-redirection.md) |
| **infra-0001** | Developer Experience & Tooling (Air, Pre-commit, Seed) | [Read Record](docs/adr/infra-0001-developer-experience-tooling.md) |
| **security-0001** | HTTP Security Headers Hardening & Route CSP | [Read Record](docs/adr/security-0001-http-security-headers-hardening-csp.md) |
| **security-0002** | Security Audit Logging | [Read Record](docs/adr/security-0002-security-audit-logging.md) |
| **testing-0001** | Benchmark Testing & k6 Performance Engineering | [Read Record](docs/adr/testing-0001-benchmarks-and-k6-load-testing.md) |

---

## 🛠️ Implementing a New Feature (Workflow Guide)

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
2. Add E2E integration test scenarios to `server/internal/e2e/e2e_test.go` within the Table-Driven test cases slice.
3. Run verification suite:
   ```bash
   make test              # Run unit tests
   make test-integration  # Run E2E integration tests against Testcontainers
   ```

---

## 🧪 Testing Guide

```bash
# Run unit tests only (ignores integration build tags automatically)
make test

# Run integration tests using Testcontainers
make test-integration

# Run all unit and integration tests
make test-all
```

---

## ⚙️ Environment Variables Reference

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
