//go:build integration

package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestURLManagementFlow(t *testing.T) {
	ts, _ := setupTestServer(t)
	if ts == nil {
		return
	}

	// Register user & obtain access token
	regReq := user.RegisterRequest{
		Email:    "url_flow@example.com",
		Password: "password123",
		FullName: "URL Flow User",
	}
	_, regApiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", regReq)
	var loginRes user.LoginResponse
	_ = json.Unmarshal(regApiResp.Data, &loginRes)
	token := loginRes.AccessToken

	customCode := "url-flow-code"

	// 1. Create Short URL
	createReq := url.CreateURLRequest{
		OriginalURL: "https://example.com/original-destination",
		CustomCode:  customCode,
		Title:       "URL Flow Link",
	}
	resp, apiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/urls", token, createReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var createdURL url.URLResponse
	err := json.Unmarshal(apiResp.Data, &createdURL)
	require.NoError(t, err)
	assert.Equal(t, customCode, createdURL.ShortCode)
	urlID := createdURL.ID.String()

	// 2. Create Duplicate Custom Code (Conflict)
	resp, apiResp = executeRequest(t, http.MethodPost, ts.URL+"/api/v1/urls", token, createReq)
	assert.Equal(t, http.StatusConflict, resp.StatusCode)

	// 3. List URLs (DataTable Search & Filter)
	resp, apiResp = executeRequest(t, http.MethodGet, ts.URL+"/api/v1/urls?search=Link&active=1", token, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var listURLs []url.URLResponse
	_ = json.Unmarshal(apiResp.Data, &listURLs)
	assert.NotEmpty(t, listURLs)

	// 4. Get URL By ID
	resp, apiResp = executeRequest(t, http.MethodGet, fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, urlID), token, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 5. Update URL
	newTitle := "Updated URL Title"
	updateReq := url.UpdateURLRequest{Title: &newTitle}
	resp, apiResp = executeRequest(t, http.MethodPut, fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, urlID), token, updateReq)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var updatedURL url.URLResponse
	_ = json.Unmarshal(apiResp.Data, &updatedURL)
	assert.Equal(t, "Updated URL Title", updatedURL.Title)

	// 6. Public Redirection
	resp, _ = executeRequest(t, http.MethodGet, ts.URL+"/"+customCode, "", nil)
	assert.Equal(t, http.StatusTemporaryRedirect, resp.StatusCode)
	assert.Equal(t, "https://example.com/original-destination", resp.Header.Get("Location"))

	// 7. Delete Short URL
	resp, apiResp = executeRequest(t, http.MethodDelete, fmt.Sprintf("%s/api/v1/urls/%s", ts.URL, urlID), token, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.True(t, apiResp.Success)

	// 8. Public Redirection After Deletion (404)
	resp, _ = executeRequest(t, http.MethodGet, ts.URL+"/"+customCode, "", nil)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}
