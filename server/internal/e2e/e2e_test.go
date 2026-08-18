//go:build integration

package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/app"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
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

	// Spin up PostgreSQL Testcontainer using postgres:18-alpine
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

	// 1. Run DB Migration directly via app.RunDBMigration (golang-migrate)
	migrationURL := "file://../../db/migration"
	err = app.RunDBMigration(migrationURL, connStr)
	require.NoError(t, err)

	// 2. Connect PostgreSQL pool
	pool, err := postgres.NewPool(ctx, postgres.Config{Source: connStr})
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	// 3. Bootstrap Router directly using app.BuildRouter
	cfg := config.Config{
		Environment:          "testing",
		AppBaseURL:           "http://localhost:8080",
		ServerAddress:        "127.0.0.1:0",
		JWTSecret:            "test-secret-key-that-is-at-least-32-bytes!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 24 * time.Hour,
	}

	appLogger := logger.New(cfg.Environment, io.Discard)
	r, err := app.BuildRouter(cfg, pool, appLogger)
	require.NoError(t, err)

	ts := httptest.NewServer(r)
	t.Cleanup(ts.Close)

	return ts, pool
}

func executeRequest(t *testing.T, method, urlStr, bearerToken string, body any) (*http.Response, APIResponse) {
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

func TestE2E_FullApplicationFlow(t *testing.T) {
	ts, _ := setupTestServer(t)
	if ts == nil {
		return
	}

	var (
		accessToken  string
		refreshToken string
		createdURLID string
		customCode   = "e2e-table-code"
	)

	testCases := []struct {
		name           string
		method         string
		url            func() string
		token          func() string
		body           func() any
		expectedStatus int
		verify         func(t *testing.T, resp *http.Response, apiResp APIResponse)
	}{
		{
			name:           "1. Health Check",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/health" },
			token:          func() string { return "" },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.Contains(t, resp.Header.Get("Content-Type"), "application/json")
			},
		},
		{
			name:           "2. Version Check",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/version" },
			token:          func() string { return "" },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.True(t, apiResp.Success)
				assert.Equal(t, "SUCCESS", apiResp.Code)
			},
		},
		{
			name:   "3. User Registration",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/auth/register" },
			token:  func() string { return "" },
			body: func() any {
				return user.RegisterRequest{
					Email:    "table_user@example.com",
					Password: "securepassword123",
					FullName: "Table Driver",
				}
			},
			expectedStatus: http.StatusCreated,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var loginRes user.LoginResponse
				err := json.Unmarshal(apiResp.Data, &loginRes)
				require.NoError(t, err)
				require.NotEmpty(t, loginRes.AccessToken)

				accessToken = loginRes.AccessToken
				refreshToken = loginRes.RefreshToken
				assert.Equal(t, "table_user@example.com", loginRes.User.Email)
			},
		},
		{
			name:   "4. Duplicate User Registration Conflict",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/auth/register" },
			token:  func() string { return "" },
			body: func() any {
				return user.RegisterRequest{
					Email:    "table_user@example.com",
					Password: "securepassword123",
					FullName: "Duplicate Tester",
				}
			},
			expectedStatus: http.StatusConflict,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.Equal(t, "CONFLICT", apiResp.Code)
			},
		},
		{
			name:   "5. User Login",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/auth/login" },
			token:  func() string { return "" },
			body: func() any {
				return user.LoginRequest{
					Email:    "table_user@example.com",
					Password: "securepassword123",
				}
			},
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var loginRes user.LoginResponse
				_ = json.Unmarshal(apiResp.Data, &loginRes)
				assert.NotEmpty(t, loginRes.AccessToken)
			},
		},
		{
			name:           "6. Get User Profile /me",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/api/v1/auth/me" },
			token:          func() string { return accessToken },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var userRes user.UserResponse
				_ = json.Unmarshal(apiResp.Data, &userRes)
				assert.Equal(t, "table_user@example.com", userRes.Email)
			},
		},
		{
			name:   "7. Refresh Token",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/auth/refresh" },
			token:  func() string { return "" },
			body: func() any {
				return user.RefreshTokenRequest{RefreshToken: refreshToken}
			},
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var refRes user.RefreshTokenResponse
				_ = json.Unmarshal(apiResp.Data, &refRes)
				assert.NotEmpty(t, refRes.AccessToken)
			},
		},
		{
			name:   "8. Create Short URL (Custom Code)",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/urls" },
			token:  func() string { return accessToken },
			body: func() any {
				return url.CreateURLRequest{
					OriginalURL: "https://example.com/target-page",
					CustomCode:  customCode,
					Title:       "Table Test Link",
				}
			},
			expectedStatus: http.StatusCreated,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var urlRes url.URLResponse
				_ = json.Unmarshal(apiResp.Data, &urlRes)
				assert.Equal(t, customCode, urlRes.ShortCode)
				createdURLID = urlRes.ID.String()
			},
		},
		{
			name:   "9. Create Duplicate Custom Short Code",
			method: http.MethodPost,
			url:    func() string { return ts.URL + "/api/v1/urls" },
			token:  func() string { return accessToken },
			body: func() any {
				return url.CreateURLRequest{
					OriginalURL: "https://another-domain.com",
					CustomCode:  customCode,
				}
			},
			expectedStatus: http.StatusConflict,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.Equal(t, "CONFLICT", apiResp.Code)
			},
		},
		{
			name:           "10. List User Short URLs (DataTable Filter & Search)",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/api/v1/urls?search=Table&sort_by=created_at&sort_direction=desc&active=1" },
			token:          func() string { return accessToken },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var urls []url.URLResponse
				_ = json.Unmarshal(apiResp.Data, &urls)
				assert.NotEmpty(t, urls)
				assert.Equal(t, customCode, urls[0].ShortCode)
			},
		},
		{
			name:           "11. Get URL By ID",
			method:         http.MethodGet,
			url:            func() string { return fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, createdURLID) },
			token:          func() string { return accessToken },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var urlRes url.URLResponse
				_ = json.Unmarshal(apiResp.Data, &urlRes)
				assert.Equal(t, createdURLID, urlRes.ID.String())
			},
		},
		{
			name:   "12. Update URL",
			method: http.MethodPut,
			url:    func() string { return fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, createdURLID) },
			token:  func() string { return accessToken },
			body: func() any {
				newTitle := "Updated Table Link Title"
				newURL := "https://example.com/updated-page"
				return url.UpdateURLRequest{
					Title:       &newTitle,
					OriginalURL: &newURL,
				}
			},
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				var urlRes url.URLResponse
				_ = json.Unmarshal(apiResp.Data, &urlRes)
				assert.Equal(t, "Updated Table Link Title", urlRes.Title)
				assert.Equal(t, "https://example.com/updated-page", urlRes.OriginalURL)
			},
		},
		{
			name:           "13. Public Redirection Endpoint",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/" + customCode },
			token:          func() string { return "" },
			body:           func() any { return nil },
			expectedStatus: http.StatusTemporaryRedirect,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.Equal(t, "https://example.com/updated-page", resp.Header.Get("Location"))
			},
		},
		{
			name:           "14. Get URL Analytics Summary",
			method:         http.MethodGet,
			url:            func() string { return fmt.Sprintf("%s/api/v1/urls/%s/analytics", ts.URL, createdURLID) },
			token:          func() string { return accessToken },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				time.Sleep(100 * time.Millisecond) // wait for async click logging
				var summary analytics.AnalyticsSummaryResponse
				_ = json.Unmarshal(apiResp.Data, &summary)
				assert.GreaterOrEqual(t, summary.TotalClicks, int64(1))
			},
		},
		{
			name:           "15. Delete Short URL",
			method:         http.MethodDelete,
			url:            func() string { return fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, createdURLID) },
			token:          func() string { return accessToken },
			body:           func() any { return nil },
			expectedStatus: http.StatusOK,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.True(t, apiResp.Success)
			},
		},
		{
			name:           "16. Redirection After Delete (404)",
			method:         http.MethodGet,
			url:            func() string { return ts.URL + "/" + customCode },
			token:          func() string { return "" },
			body:           func() any { return nil },
			expectedStatus: http.StatusNotFound,
			verify: func(t *testing.T, resp *http.Response, apiResp APIResponse) {
				assert.Equal(t, "NOT_FOUND", apiResp.Code)
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp, apiResp := executeRequest(t, tc.method, tc.url(), tc.token(), tc.body())
			assert.Equal(t, tc.expectedStatus, resp.StatusCode)
			if tc.verify != nil {
				tc.verify(t, resp, apiResp)
			}
		})
	}
}
