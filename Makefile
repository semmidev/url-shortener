VERSION ?= 1.0.0
BUILD_TIME ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS = -ldflags "-X 'github.com/semmidev/url-shortener/server/internal/config.Version=$(VERSION)' -X 'github.com/semmidev/url-shortener/server/internal/config.BuildTime=$(BUILD_TIME)' -X 'github.com/semmidev/url-shortener/server/internal/config.GitCommit=$(GIT_COMMIT)'"

DOCKER_CMD ?= $(shell command -v docker 2>/dev/null || command -v podman 2>/dev/null || echo "docker")

.PHONY: run build test test-integration test-all swagger sqlc docker-up docker-down up-dev down-dev logs-dev clean

# Run backend API locally
run:
	go run $(LDFLAGS) ./server/cmd/api

# Build static binary with ldflags version metadata injection
build:
	go build $(LDFLAGS) -o bin/api ./server/cmd/api

# Run unit tests only (automatically skips integration build tag)
test:
	go test ./... -v

# Run E2E integration tests using Testcontainers-Go (-tags=integration)
test-integration:
	go test -tags=integration ./... -v

# Run all unit and integration tests
test-all:
	go test -tags=integration ./... -v

# Generate Swagger REST API documentation
swagger:
	go run github.com/swaggo/swag/cmd/swag@latest init -d server/cmd/api,server/internal/user,server/internal/url,server/internal/analytics -g main.go -o server/docs --parseDependency --parseInternal

# Generate SQLC type-safe database code
sqlc:
	cd server && sqlc generate

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
