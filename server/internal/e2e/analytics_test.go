//go:build integration

package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/tenant"
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

	// 1. Register user & obtain access token
	regReq := user.RegisterRequest{
		Email:    "analytics_flow@example.com",
		Password: "password123",
		FullName: "Analytics Flow User",
	}
	_, regApiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", regReq)
	var loginRes user.LoginResponse
	_ = json.Unmarshal(regApiResp.Data, &loginRes)
	token := loginRes.AccessToken
	require.NotEmpty(t, token)

	// 2. Create Tenant for User
	tenantReq := tenant.CreateTenantRequest{
		Name: "Analytics Tenant",
		Slug: "analytics-tenant",
	}
	resp, apiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/tenants", token, tenantReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var createdTenant tenant.TenantResponse
	err := json.Unmarshal(apiResp.Data, &createdTenant)
	require.NoError(t, err)
	tenantID := createdTenant.ID.String()

	customCode := "analytics-code"

	// 3. Create Short URL within Tenant Context
	createReq := url.CreateURLRequest{
		OriginalURL: "https://example.com/analytics-target",
		CustomCode:  customCode,
	}
	_, createApiResp := executeRequestWithTenant(t, http.MethodPost, ts.URL+"/api/v1/urls", token, tenantID, createReq)
	var createdURL url.URLResponse
	err = json.Unmarshal(createApiResp.Data, &createdURL)
	require.NoError(t, err)
	urlID := createdURL.ID.String()

	// 4. Perform Public Redirection to trigger click logging
	resp, _ = executeRequest(t, http.MethodGet, ts.URL+"/"+customCode, "", nil)
	assert.Equal(t, http.StatusTemporaryRedirect, resp.StatusCode)

	// Sleep briefly for async click logging
	time.Sleep(150 * time.Millisecond)

	// 5. Fetch Analytics Summary within Tenant Context
	resp, apiResp = executeRequestWithTenant(t, http.MethodGet, fmt.Sprintf("%s/api/v1/urls/%s/analytics", ts.URL, urlID), token, tenantID, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var summary analytics.AnalyticsSummaryResponse
	err = json.Unmarshal(apiResp.Data, &summary)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, summary.TotalClicks, int64(1))
}
