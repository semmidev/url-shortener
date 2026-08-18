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

func TestAnalyticsFlow(t *testing.T) {
	ts, _ := setupTestServer(t)
	if ts == nil {
		return
	}

	// Register user & obtain access token
	regReq := user.RegisterRequest{
		Email:    "analytics_flow@example.com",
		Password: "password123",
		FullName: "Analytics Flow User",
	}
	_, regApiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", regReq)
	var loginRes user.LoginResponse
	_ = json.Unmarshal(regApiResp.Data, &loginRes)
	token := loginRes.AccessToken

	customCode := "analytics-code"

	// Create Short URL
	createReq := url.CreateURLRequest{
		OriginalURL: "https://example.com/analytics-target",
		CustomCode:  customCode,
	}
	_, createApiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/urls", token, createReq)
	var createdURL url.URLResponse
	err := json.Unmarshal(createApiResp.Data, &createdURL)
	require.NoError(t, err)
	urlID := createdURL.ID.String()

	// Perform Public Redirection to trigger click logging
	resp, _ := executeRequest(t, http.MethodGet, ts.URL+"/"+customCode, "", nil)
	assert.Equal(t, http.StatusTemporaryRedirect, resp.StatusCode)

	// Sleep briefly for async click logging
	time.Sleep(150 * time.Millisecond)

	// Fetch Analytics Summary
	resp, apiResp := executeRequest(t, http.MethodGet, fmt.Sprintf("%s/api/v1/urls/%s/analytics", ts.URL, urlID), token, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var summary analytics.AnalyticsSummaryResponse
	err = json.Unmarshal(apiResp.Data, &summary)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, summary.TotalClicks, int64(1))
}
