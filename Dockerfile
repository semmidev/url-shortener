# ─── Stage 0: Frontend Build ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
ARG VERSION=1.0.0
ENV VITE_APP_VERSION=$VERSION
WORKDIR /app/web

COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY web/ .
RUN npm run build

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder
ARG VERSION=1.0.0
ARG BUILD_TIME=unknown
ARG GIT_COMMIT=unknown

WORKDIR /app

# Install ca-certificates for HTTPS and git/tzdata
RUN apk add --no-cache git ca-certificates tzdata

# Cache deps separately from source
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
COPY --from=frontend-builder /app/web/dist ./server/internal/web/dist

# Build fully static binary with version metadata injection
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -extldflags '-static' \
    -X 'github.com/semmidev/url-shortener/server/internal/config.Version=${VERSION}' \
    -X 'github.com/semmidev/url-shortener/server/internal/config.BuildTime=${BUILD_TIME}' \
    -X 'github.com/semmidev/url-shortener/server/internal/config.GitCommit=${GIT_COMMIT}'" \
    -trimpath \
    -o /bin/api ./server/cmd/api

# Create non-root user/group with predictable UID/GID
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# ─── Stage 2: Minimal Production Runtime (scratch) ───────────────────────────
FROM scratch

# Copy TLS Certificates and Timezone data
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy user/group entries for non-root execution
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

WORKDIR /app

# Copy compiled API binary and default configuration
COPY --from=builder /bin/api /app/api
COPY --from=builder /app/.env.example /app/app.env

EXPOSE 8080

USER appuser:appgroup

ENTRYPOINT ["/app/api"]
