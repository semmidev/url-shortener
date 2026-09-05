VERSION ?= 1.0.0
BUILD_TIME ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS = -ldflags "-X 'github.com/semmidev/url-shortener/server/internal/config.Version=$(VERSION)' -X 'github.com/semmidev/url-shortener/server/internal/config.BuildTime=$(BUILD_TIME)' -X 'github.com/semmidev/url-shortener/server/internal/config.GitCommit=$(GIT_COMMIT)'"

DB_URL ?= postgres://postgres:postgres@127.0.0.1:5432/urlshortener?sslmode=disable
DOCKER_CMD ?= $(shell command -v docker 2>/dev/null || command -v podman 2>/dev/null || echo "docker")
GOLANGCI_LINT_CMD ?= $(shell command -v golangci-lint 2>/dev/null || echo "go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest")
MIGRATE_CMD ?= $(shell command -v migrate 2>/dev/null || echo "go run github.com/golang-migrate/migrate/v4/cmd/migrate@latest")

BUN_CMD ?= $(shell command -v bun 2>/dev/null || echo "$(HOME)/.bun/bin/bun")

.PHONY: run run-worker dev build build-frontend test test-integration test-all lint seed setup-hooks swagger sqlc new_migration migrateup migrateup1 migratedown migratedown1 createdb dropdb docker-up docker-down up-dev down-dev logs-dev clean

# Run backend API locally (builds frontend first and embeds static dist)
run: build-frontend
	go run $(LDFLAGS) ./server/cmd/api

# Run background outbox & async worker locally
run-worker:
	go run $(LDFLAGS) ./server/cmd/worker

# Run backend API locally with Air live hot-reload
dev:
	air -c .air.toml

# Seed database with initial default data
seed:
	go run $(LDFLAGS) ./server/cmd/seed


# Setup pre-commit git hooks
setup-hooks:
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install; \
		echo "✅ pre-commit hooks installed"; \
	elif command -v lefthook >/dev/null 2>&1; then \
		lefthook install; \
		echo "✅ lefthook hooks installed"; \
	else \
		echo "⚠️ Neither pre-commit nor lefthook command found in PATH"; \
	fi

# Build React SPA frontend using Bun and copy to Go embed directory
build-frontend:
	@echo "🎨 Building React SPA frontend with Bun..."
	@cd web && $(BUN_CMD) install && $(BUN_CMD) run build
	@echo "📦 Copying frontend build to embed directory..."
	@rm -rf server/internal/web/dist
	@cp -r web/dist server/internal/web/dist
	@touch server/internal/web/dist/.gitkeep
	@echo "✅ Frontend built and ready for embedding"

# Build static binary with ldflags version metadata injection
build: build-frontend
	go build $(LDFLAGS) -o bin/api ./server/cmd/api

# Run unit tests only (automatically skips integration build tag)
test:
	go test -race ./... -v

# Run E2E integration tests using Testcontainers-Go (-tags=integration)
test-integration:
	go test -race -tags=integration ./... -v

# Run all unit and integration tests
test-all:
	go test -race -tags=integration ./... -v

# Run Go performance benchmark tests
benchmark:
	go test -bench=. -benchmem ./server/internal/...

# Run k6 smoke load test
loadtest-smoke:
	RATE_LIMIT_PUBLIC_REQUESTS=100000 RATE_LIMIT_API_REQUESTS=100000 RATE_LIMIT_AUTH_REQUESTS=100000 k6 run scripts/loadtest/smoke_test.js

# Run k6 standard load test
loadtest-load:
	RATE_LIMIT_PUBLIC_REQUESTS=100000 RATE_LIMIT_API_REQUESTS=100000 RATE_LIMIT_AUTH_REQUESTS=100000 k6 run scripts/loadtest/load_test.js

# Run k6 stress test
loadtest-stress:
	RATE_LIMIT_PUBLIC_REQUESTS=100000 RATE_LIMIT_API_REQUESTS=100000 RATE_LIMIT_AUTH_REQUESTS=100000 k6 run scripts/loadtest/stress_test.js

# Run golangci-lint code analysis
lint:
	$(GOLANGCI_LINT_CMD) run ./server/...

# Generate Swagger REST API documentation
swagger:
	go run github.com/swaggo/swag/cmd/swag@latest init -d server/cmd/api,server/internal/user,server/internal/url,server/internal/analytics,server/internal/admin -g main.go -o server/docs --parseDependency --parseInternal

# Generate SQLC type-safe database code
sqlc:
	cd server && sqlc generate

# Create a new SQL migration file (usage: make new_migration name=add_user_index)
new_migration:
	$(MIGRATE_CMD) create -ext sql -dir server/db/migration -seq $(name)

# Apply all database migrations up
migrateup:
	$(MIGRATE_CMD) -path server/db/migration -database "$(DB_URL)" -verbose up

# Apply 1 step of database migration up
migrateup1:
	$(MIGRATE_CMD) -path server/db/migration -database "$(DB_URL)" -verbose up 1

# Rollback all database migrations down
migratedown:
	$(MIGRATE_CMD) -path server/db/migration -database "$(DB_URL)" -verbose down

# Rollback 1 step of database migration down
migratedown1:
	$(MIGRATE_CMD) -path server/db/migration -database "$(DB_URL)" -verbose down 1

# Create database via docker container exec
createdb:
	$(DOCKER_CMD) exec -it url-shortener-db createdb --username=postgres --owner=postgres urlshortener

# Drop database via docker container exec
dropdb:
	$(DOCKER_CMD) exec -it url-shortener-db dropdb --username=postgres urlshortener

# Start local development infrastructure (PostgreSQL) using compose.dev.yml
up-dev:
	$(DOCKER_CMD) compose -f compose.dev.yml up -d

# Stop local development infrastructure using compose.dev.yml
down-dev:
	$(DOCKER_CMD) compose -f compose.dev.yml down

# Stream local development infrastructure logs
logs-dev:
	$(DOCKER_CMD) compose -f compose.dev.yml logs -f

# Start full stack production containers via Docker Compose (compose.yml)
docker-up:
	$(DOCKER_CMD) compose -f compose.yml up -d

# Stop full stack production containers via Docker Compose (compose.yml)
docker-down:
	$(DOCKER_CMD) compose -f compose.yml down

# Clean build artifacts
clean:
	rm -rf bin/ tmp/ coverage.out
