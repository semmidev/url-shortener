//go:build integration

package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/app"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/worker"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
	"github.com/testcontainers/testcontainers-go/wait"
)

type APIResponse struct {
	Success bool              `json:"success"`
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Data    json.RawMessage   `json:"data"`
	Meta    json.RawMessage   `json:"meta"`
	Errors  map[string]string `json:"errors"`
}

func setupTestServer(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()

	// Automatically disable Ryuk reaper for Podman compatibility if not explicitly set
	if os.Getenv("TESTCONTAINERS_RYUK_DISABLED") == "" {
		_ = os.Setenv("TESTCONTAINERS_RYUK_DISABLED", "true")
	}

	// 1. Spin up PostgreSQL Testcontainer using postgres:18-alpine
	pgContainer, err := tcpostgres.Run(ctx, "postgres:18-alpine",
		tcpostgres.WithDatabase("test_urlshortener"),
		tcpostgres.WithUsername("postgres"),
		tcpostgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Skipf("skipping integration test: docker/podman daemon not running or testcontainers failed: %v", err)
		return nil, nil
	}
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	// 2. Spin up Redis Testcontainer using redis:7-alpine
	redisContainer, err := tcredis.Run(ctx, "redis:7-alpine")
	if err != nil {
		t.Skipf("skipping integration test: redis container failed: %v", err)
		return nil, nil
	}
	t.Cleanup(func() { _ = redisContainer.Terminate(ctx) })

	redisHost, err := redisContainer.Host(ctx)
	require.NoError(t, err)
	redisPort, err := redisContainer.MappedPort(ctx, "6379/tcp")
	require.NoError(t, err)
	redisAddr := redisHost + ":" + redisPort.Port()

	// 3. Run DB Migration directly via app.RunDBMigration
	migrationURL := "file://../../db/migration"
	err = app.RunDBMigration(migrationURL, connStr)
	require.NoError(t, err)

	// 4. Connect PostgreSQL pool
	pool, err := postgres.NewPool(ctx, postgres.Config{Source: connStr})
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	// 5. Bootstrap Router & Services with Redis configuration
	cfg := config.Config{
		Environment:          "testing",
		AppBaseURL:           "http://localhost:8080",
		ServerAddress:        "127.0.0.1:0",
		JWTSecret:            "test-secret-key-that-is-at-least-32-bytes!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 24 * time.Hour,
		RedisAddress:         redisAddr,
		WorkerConcurrency:    10,

		RateLimitAuthRequests:   100,
		RateLimitAuthWindow:     1 * time.Minute,
		RateLimitAPIRequests:    1000,
		RateLimitAPIWindow:      1 * time.Minute,
		RateLimitPublicRequests: 1000,
		RateLimitPublicWindow:   1 * time.Minute,
	}

	appLogger := logger.New(cfg.Environment, io.Discard)
	testCtx, cancelTestCtx := context.WithCancel(context.Background())
	t.Cleanup(cancelTestCtx)

	r, err := app.BuildRouter(testCtx, cfg, pool, appLogger)
	require.NoError(t, err)

	// 6. Start Redis Asynq Worker Task Processor for background tasks
	store := db.NewStore(pool)
	rc, _ := cache.NewRedisCache(redisAddr, "", 0)
	taskProcessor := worker.NewRedisTaskProcessor(asynq.RedisClientOpt{Addr: redisAddr}, store, appLogger, rc, 10)
	err = taskProcessor.Start()
	require.NoError(t, err)
	t.Cleanup(func() {
		taskProcessor.Shutdown()
	})

	ts := httptest.NewServer(r)
	t.Cleanup(ts.Close)

	return ts, pool
}

func executeRequestWithHeaders(t *testing.T, method, urlStr, bearerToken string, headers map[string]string, body any) (*http.Response, APIResponse) {
	t.Helper()
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, urlStr, bodyReader)
	require.NoError(t, err)

	req.Header.Set("Content-Type", "application/json")
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Don't follow redirects automatically
		},
	}

	resp, err := client.Do(req)
	require.NoError(t, err)

	respBytes, err := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	require.NoError(t, err)

	var apiResp APIResponse
	if len(respBytes) > 0 && resp.Header.Get("Content-Type") == "application/json" {
		_ = json.Unmarshal(respBytes, &apiResp)
	}

	return resp, apiResp
}

func executeRequest(t *testing.T, method, urlStr, bearerToken string, body any) (*http.Response, APIResponse) {
	return executeRequestWithHeaders(t, method, urlStr, bearerToken, nil, body)
}

func executeRequestWithTenant(t *testing.T, method, urlStr, bearerToken, tenantID string, body any) (*http.Response, APIResponse) {
	headers := map[string]string{}
	if tenantID != "" {
		headers["X-Tenant-ID"] = tenantID
	}
	return executeRequestWithHeaders(t, method, urlStr, bearerToken, headers, body)
}
