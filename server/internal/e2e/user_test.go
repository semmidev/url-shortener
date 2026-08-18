//go:build integration

package e2e

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserFlow(t *testing.T) {
	ts, _ := setupTestServer(t)
	if ts == nil {
		return
	}

	// 1. Register User
	regReq := user.RegisterRequest{
		Email:    "user_flow@example.com",
		Password: "password123",
		FullName: "Modular Test User",
	}
	resp, apiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", regReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	assert.True(t, apiResp.Success)

	var loginRes user.LoginResponse
	err := json.Unmarshal(apiResp.Data, &loginRes)
	require.NoError(t, err)
	require.NotEmpty(t, loginRes.AccessToken)
	token := loginRes.AccessToken

	// 2. Duplicate Registration Conflict
	resp, apiResp = executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", regReq)
	assert.Equal(t, http.StatusConflict, resp.StatusCode)
	assert.Equal(t, "CONFLICT", apiResp.Code)

	// 3. User Login
	loginReq := user.LoginRequest{
		Email:    "user_flow@example.com",
		Password: "password123",
	}
	resp, apiResp = executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/login", "", loginReq)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.True(t, apiResp.Success)

	// 4. Get User Profile (/me)
	resp, apiResp = executeRequest(t, http.MethodGet, ts.URL+"/api/v1/auth/me", token, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var profileRes user.UserResponse
	_ = json.Unmarshal(apiResp.Data, &profileRes)
	assert.Equal(t, "user_flow@example.com", profileRes.Email)

	// 5. Refresh Token
	refReq := user.RefreshTokenRequest{RefreshToken: loginRes.RefreshToken}
	resp, apiResp = executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/refresh", "", refReq)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var refRes user.RefreshTokenResponse
	_ = json.Unmarshal(apiResp.Data, &refRes)
	assert.NotEmpty(t, refRes.AccessToken)
}
