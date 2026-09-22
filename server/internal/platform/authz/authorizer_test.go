package authz

import (
	"testing"

	"uuid"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/semmidev/url-shortener/server/internal/platform/permission"
)

func TestSpatieAuthorizer_Standalone(t *testing.T) {
	ctx := t.Context()
	authz, err := NewSpatieAuthorizer(nil)
	require.NoError(t, err)
	require.NotNil(t, authz)

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

	t.Run("Member role restricted to view only", func(t *testing.T) {
		memberID := uuid.New()
		tenantID := uuid.New().String()

		err := authz.AddUserRole(ctx, memberID, "member", tenantID)
		require.NoError(t, err)

		// Set member role permissions explicitly to urls.read ONLY
		authz.SetRolePermissions("member", tenantID, []string{permission.UrlsRead})

		canRead, err := authz.Can(ctx, memberID, tenantID, permission.UrlsRead)
		require.NoError(t, err)
		assert.True(t, canRead)

		canCreate, err := authz.Can(ctx, memberID, tenantID, permission.UrlsCreate)
		require.NoError(t, err)
		assert.False(t, canCreate)

		perms, err := authz.GetPermissionsForUser(ctx, memberID, tenantID)
		require.NoError(t, err)
		assert.Equal(t, []string{permission.UrlsRead}, perms)
	})
}
