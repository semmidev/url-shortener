//go:build integration

package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/tenant"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMultiTenantSaaS_FullFlow(t *testing.T) {
	ts, _ := setupTestServer(t)
	if ts == nil {
		return
	}

	// 1. Register User 1 (Tenant Owner)
	ownerReg := user.RegisterRequest{
		Email:    "tenant_owner@example.com",
		Password: "password123",
		FullName: "Tenant Owner",
	}
	_, regApiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", ownerReg)
	var ownerLoginRes user.LoginResponse
	_ = json.Unmarshal(regApiResp.Data, &ownerLoginRes)
	ownerToken := ownerLoginRes.AccessToken
	require.NotEmpty(t, ownerToken)

	// 2. User 1 Creates Tenant "Stark Corp"
	createTenantReq := tenant.CreateTenantRequest{
		Name: "Stark Corp",
		Slug: "stark-corp",
	}
	resp, apiResp := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/tenants", ownerToken, createTenantReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var createdTenant tenant.TenantResponse
	err := json.Unmarshal(apiResp.Data, &createdTenant)
	require.NoError(t, err)
	assert.Equal(t, "Stark Corp", createdTenant.Name)
	assert.Equal(t, "stark-corp", createdTenant.Slug)
	assert.NotEmpty(t, createdTenant.JoinCode)
	tenantID := createdTenant.ID.String()

	// 3. User 1 Lists User Tenants
	resp, apiResp = executeRequest(t, http.MethodGet, ts.URL+"/api/v1/tenants?all=true", ownerToken, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var userTenants []tenant.TenantResponse
	_ = json.Unmarshal(apiResp.Data, &userTenants)
	assert.NotEmpty(t, userTenants)

	// 4. Register User 2 (Tenant Member)
	memberReg := user.RegisterRequest{
		Email:    "tenant_member@example.com",
		Password: "password123",
		FullName: "Tenant Member",
	}
	_, regApiResp2 := executeRequest(t, http.MethodPost, ts.URL+"/api/v1/auth/register", "", memberReg)
	var memberLoginRes user.LoginResponse
	_ = json.Unmarshal(regApiResp2.Data, &memberLoginRes)
	memberToken := memberLoginRes.AccessToken
	memberUserID := memberLoginRes.User.ID.String()
	require.NotEmpty(t, memberToken)

	// 5. User 2 Joins "Stark Corp" using Join Code
	joinReq := tenant.JoinTenantRequest{
		JoinCode: createdTenant.JoinCode,
	}
	resp, apiResp = executeRequest(t, http.MethodPost, ts.URL+"/api/v1/tenants/join", memberToken, joinReq)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var joinedTenant tenant.TenantResponse
	_ = json.Unmarshal(apiResp.Data, &joinedTenant)
	assert.Equal(t, createdTenant.ID, joinedTenant.ID)

	// 6. Owner Lists Tenant Members
	resp, apiResp = executeRequest(t, http.MethodGet, fmt.Sprintf("%s/api/v1/tenants/%s/members", ts.URL, tenantID), ownerToken, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var members []tenant.TenantMemberResponse
	_ = json.Unmarshal(apiResp.Data, &members)
	assert.Len(t, members, 2)

	// 7. Owner Creates Custom Tenant Role "Link Adder"
	createRoleReq := tenant.CreateTenantRoleRequest{
		Name:        "link_adder",
		DisplayName: "Link Adder",
		Description: "Allowed to create and read URLs",
		Permissions: []string{"urls.create", "urls.read"},
	}
	resp, apiResp = executeRequest(t, http.MethodPost, fmt.Sprintf("%s/api/v1/tenants/%s/roles", ts.URL, tenantID), ownerToken, createRoleReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var customRole tenant.TenantRoleResponse
	_ = json.Unmarshal(apiResp.Data, &customRole)
	assert.Equal(t, "link_adder", customRole.Name)

	// 8. Owner Assigns "Link Adder" Role to User 2
	updateRoleReq := tenant.UpdateTenantMemberRoleRequest{
		Role: "link_adder",
	}
	resp, apiResp = executeRequest(t, http.MethodPut, fmt.Sprintf("%s/api/v1/tenants/%s/members/%s", ts.URL, tenantID, memberUserID), ownerToken, updateRoleReq)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// 9. User 2 Creates Short URL inside Tenant Context (X-Tenant-ID)
	createURLReq := url.CreateURLRequest{
		OriginalURL: "https://starkindustries.com/reactor",
		CustomCode:  "stark-arc",
		Title:       "Arc Reactor Specs",
	}
	resp, apiResp = executeRequestWithTenant(t, http.MethodPost, ts.URL+"/api/v1/urls", memberToken, tenantID, createURLReq)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var createdURL url.URLResponse
	_ = json.Unmarshal(apiResp.Data, &createdURL)
	assert.Equal(t, "stark-arc", createdURL.ShortCode)

	// 10. Owner Removes User 2 from Tenant Members
	resp, apiResp = executeRequest(t, http.MethodDelete, fmt.Sprintf("%s/api/v1/tenants/%s/members/%s", ts.URL, tenantID, memberUserID), ownerToken, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.True(t, apiResp.Success)
}
