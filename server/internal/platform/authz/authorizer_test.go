package authz

import (
	"testing"

	"github.com/google/uuid"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/semmidev/url-shortener/server/internal/platform/permission"
)

func TestCasbinAuthorizer_Standalone(t *testing.T) {
	ctx := t.Context()
	authz, err := NewCasbinAuthorizer(nil)
	require.NoError(t, err)
	require.NotNil(t, authz)

	// Add manual policies and role assignments for testing
	_, err = authz.enforcer.AddPolicy("superadmin", DefaultDomain, "*", "*", "allow")
	require.NoError(t, err)

	_, err = authz.enforcer.AddPolicy("user", DefaultDomain, "urls", "read", "allow")
	require.NoError(t, err)
	_, err = authz.enforcer.AddPolicy("user", DefaultDomain, "urls", "create", "allow")
	require.NoError(t, err)

	superAdminID := uuid.New()
	userID := uuid.New()

	err = authz.AddUserRole(ctx, superAdminID, "superadmin", DefaultDomain)
	require.NoError(t, err)

	err = authz.AddUserRole(ctx, userID, "user", DefaultDomain)
	require.NoError(t, err)

	t.Run("Superadmin wildcard permissions", func(t *testing.T) {
		can, err := authz.Can(ctx, superAdminID, DefaultDomain, permission.UsersSuspend)
		require.NoError(t, err)
		assert.True(t, can)

		can, err = authz.Can(ctx, superAdminID, DefaultDomain, permission.UrlsRead)
		require.NoError(t, err)
		assert.True(t, can)
	})

	t.Run("Regular user allowed permissions", func(t *testing.T) {
		can, err := authz.Can(ctx, userID, DefaultDomain, permission.UrlsRead)
		require.NoError(t, err)
		assert.True(t, can)

		can, err = authz.Can(ctx, userID, DefaultDomain, permission.UrlsCreate)
		require.NoError(t, err)
		assert.True(t, can)
	})

	t.Run("Regular user denied permissions", func(t *testing.T) {
		can, err := authz.Can(ctx, userID, DefaultDomain, permission.UsersSuspend)
		require.NoError(t, err)
		assert.False(t, can)

		can, err = authz.Can(ctx, userID, DefaultDomain, permission.RolesPermissionsUpdate)
		require.NoError(t, err)
		assert.False(t, can)
	})

	t.Run("GetPermissionsForUser", func(t *testing.T) {
		perms, err := authz.GetPermissionsForUser(ctx, userID, DefaultDomain)
		require.NoError(t, err)
		assert.Contains(t, perms, permission.UrlsRead)
		assert.Contains(t, perms, permission.UrlsCreate)
		assert.NotContains(t, perms, permission.UsersSuspend)
	})
}
