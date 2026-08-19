//go:build integration

package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
			name:   "10. List User Short URLs (DataTable Filter & Search)",
			method: http.MethodGet,
			url: func() string {
				return ts.URL + "/api/v1/urls?search=Table&sort_by=created_at&sort_direction=desc&active=1"
			},
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
