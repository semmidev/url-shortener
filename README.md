# URL Shortener API

A clean, modern, high-performance URL Shortener REST API backend written in Go using **Modular Monolith** architecture, **Go-Chi**, and **PostgreSQL**. Features interactive Swagger UI documentation, automatic database migrations, structured wide-event logging, multi-language input validation, and containerized testing support.

---

## Architectural & Code Style Decisions

### 1. **Modular Monolith Architecture**
- **Domain Boundaries**: Divided into focused domain feature modules (`user`, `url`, `analytics`) and technical platform infrastructure (`platform/logger`, `platform/middleware`, `platform/token`, `platform/validator`, `platform/apperr`, `platform/web`).
- **Composition Root**: `server/internal/app/app.go` acts as the single composition root where database pools, domain services, handlers, and routers are wired together cleanly.

---

### 2. **Uniform Service Method Signatures**
Every domain service method strictly follows the predictable signature pattern:
$$\text{func (s *Service) MethodName(ctx context.Context, req RequestStruct) (*ResponseStruct, error)}$$

- **Encapsulated DTO Structs**: Input arguments are encapsulated into dedicated DTO structs (e.g., `user.RegisterRequest`, `url.CreateURLRequest`).
- **Context First**: `context.Context` is mandatory as the first parameter for deadline propagation, tracing, and log enrichment.

---

### 3. **Structured Wide Event Logging (`log/slog`)**
- **Zero 3rd-Party Log Dependency**: Built entirely on Go standard library `log/slog`.
- **Canonical Log Line (`event.go`)**: Instead of emitting multiple noisy log statements per HTTP request, request attributes are accumulated dynamically into a `WideEvent` context struct and emitted as **exactly ONE canonical log line** upon request completion (`middleware.WideEventLogging`).
- **Configurable Options (`LOG_LEVEL`, `LOG_FORMAT`, `LOG_ADD_SOURCE`)**: Easily controlled via environment variables.

---

### 4. **Secure Error Handling & Sensitive Attribute Masking**
- **Public vs. Internal Error Separation**: Technical stack traces and internal database errors are never exposed directly to end users.
- **Automatic Attribute Redaction (`RedactReplaceAttr`)**: Automatically masks sensitive JSON keys (`password`, `token`, `access_token`, `refresh_token`, `jwt_secret`, `google_client_secret`).

---

### 5. **Standardized JSON Responses & Unique Error Codes**
- **Success Response (`web.Success` / `web.JSON`)**:
  ```json
  {
    "success": true,
    "code": "SUCCESS",
    "message": "Operation completed successfully",
    "data": { ... },
    "meta": { "page": 1, "limit": 20, "total": 100 }
  }
  ```
- **Error Response (`web.Error` / `apperr.Error`)**:
  ```json
  {
    "success": false,
    "code": "VALIDATION_ERROR",
    "message": "validasi gagal untuk data yang dikirimkan",
    "errors": {
      "full_name": "wajib diisi",
      "email": "harus berupa alamat email yang valid"
    }
  }
  ```
- **Unique Error Codes**: `VALIDATION_ERROR`, `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`.

---

### 6. **Universal Translator & Locale Validation (`APP_LOCALE`)**
- Integrated with `go-playground/universal-translator` and `go-playground/locales/id`.
- Configurable default locale via `APP_LOCALE=id`.
- Custom field translations ensure field names are **NOT repeated** inside validation error values (e.g. `"full_name": "wajib diisi"`).

---

### 7. **Interactive OpenAPI / Swagger Documentation (`swaggo`)**
- Integrated with `github.com/swaggo/http-swagger/v2`.
- Interactive Swagger UI endpoint available at `http://localhost:8080/swagger/index.html`.
- Run `make swagger` to regenerate Open API documentation schemas (`server/docs/`).

---

### 8. **CORS Preflight & Cross-Origin Support (`github.com/go-chi/cors`)**
- Configured with `cors.Handler` to support cross-origin preflight `OPTIONS` requests from Swagger UI and external frontend clients.

---

### 9. **Database Error Mapping (`apperr.MapDBError`) & Atomic Transactions (`SQLStore.ExecTx`)**
- Low-level `pgx/v5` errors are converted into domain `apperr.Error` objects:
  - `pgx.ErrNoRows` $\rightarrow$ `apperr.NotFound(...)`
  - `23505` (`unique_violation`) $\rightarrow$ `apperr.Conflict(...)`
  - `23503` (`foreign_key_violation`) $\rightarrow$ `apperr.Invalid(...)`
- Multi-query operations execute within atomic transaction callbacks (`s.store.ExecTx`).

---

### 10. **Automated Database Migrations & Retry Resiliency (`golang-migrate`)**
- Schema migrations run automatically on startup via `app.RunDBMigration` using `golang-migrate`.
- Includes connection retry loop (up to 15s backoff) to gracefully wait while PostgreSQL container finishes booting.

---

### 11. **Configurable Graceful Shutdown (`SERVER_SHUTDOWN_TIMEOUT`)**
- Listens for `SIGINT` and `SIGTERM` signals.
- Stops accepting new HTTP connections and grants an environment-controlled timeout window (`SERVER_SHUTDOWN_TIMEOUT=10s`) for active requests to finish before closing PostgreSQL connection pools.

---

### 12. **Integration Testing & Build Tags (`//go:build integration`)**
- E2E integration tests in `server/internal/e2e/e2e_test.go` are tagged with `//go:build integration`.
- Running standard `go test ./...` runs unit tests only.
- Running `go test -tags=integration ./...` executes Testcontainers-Go integration tests against PostgreSQL 18.

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
| `DB_SOURCE` | `string` | `postgres://postgres:postgres@127.0.0.1:5432/urlshortener?sslmode=disable` | PostgreSQL connection string DSN. |
| `DB_MAX_CONNS` | `int32` | `25` | Maximum database pool connections. |
| `DB_MIN_CONNS` | `int32` | `5` | Minimum idle database pool connections. |
| `JWT_SECRET` | `string` | `super-secret-32-byte-key-for-jwt-signing!` | Secret key for signing JWT tokens. |
| `JWT_ACCESS_TOKEN_DURATION` | `duration` | `15m` | Access token expiration duration. |
| `JWT_REFRESH_TOKEN_DURATION` | `duration` | `168h` | Refresh token expiration duration (7 days). |

---

## 🛠️ Implementing a New Feature (Workflow Guide)

When adding a new feature or domain module to the backend API, follow these standard steps:

### Step 1: Database Migration
1. Create new `.up.sql` and `.down.sql` files in `server/db/migration/` (e.g. `000002_add_feature.up.sql` & `000002_add_feature.down.sql`).
2. Write clean SQL DDL statements for schema changes.

### Step 2: SQL Query Definition & SQLC Generation
1. Add type-safe SQL queries to `server/db/query/` (e.g. `server/db/query/feature.sql`).
2. Run SQLC code generation:
   ```bash
   make sqlc
   ```
3. SQLC automatically generates type-safe Go structs and query methods under `server/db/sqlc/`.

### Step 3: Domain Module & Service Implementation
1. Create or update domain files under `server/internal/<module>/`:
   - `domain.go`: Define DTO Request & Response structs with `go-playground/validator` tags (`validate:"required"`). Implement `Validate() error` using `validator.Check(r)`.
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

## 🛠️ Makefile Commands

```bash
make run               # Run backend API locally
make build             # Build production static binary in bin/api
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
make clean             # Clean build artifacts
```

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Start local PostgreSQL development database
make up-dev

# 2. Run backend API server
make run

# 3. Stop local development database
make down-dev
```

Access Swagger UI documentation at: `http://localhost:8080/swagger/index.html`

---

## 🧪 Testing

```bash
# Run unit tests only (ignores integration build tags automatically)
make test

# Run integration tests using Testcontainers
make test-integration

# Run all tests
make test-all
```
