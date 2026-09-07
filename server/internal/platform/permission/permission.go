package permission

import (
	"context"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

// Predefined Permission Codes (Source of Truth)
const (
	// User & Personal Features Permissions
	UrlsRead      = "urls.read"
	UrlsCreate    = "urls.create"
	UrlsUpdate    = "urls.update"
	UrlsDelete    = "urls.delete"
	AnalyticsRead = "analytics.read"

	// Administration & Governance Permissions
	AdminDashboardRead     = "admin.dashboard.read"
	UsersRead              = "users.read"
	UsersSuspend           = "users.suspend"
	UsersRolesUpdate       = "users.roles.update"
	UsersSessionsRevoke    = "users.sessions.revoke"
	RolesRead              = "roles.read"
	RolesCreate            = "roles.create"
	RolesPermissionsUpdate = "roles.permissions.update"
	LinksRead              = "links.read"
	LinksBan               = "links.ban"
	AuditRead              = "audit.read"
	SystemConfigRead       = "system.config.read"
	SystemConfigUpdate     = "system.config.update"

	// Multi-Tenant Governance Permissions
	TenantsRead          = "tenants.read"
	TenantsCreate        = "tenants.create"
	TenantsUpdate        = "tenants.update"
	TenantsDelete        = "tenants.delete"
	TenantsMembersManage = "tenants.members.manage"
)

type Definition struct {
	Code        string
	Module      string
	Action      string
	Description string
}

// AllPermissions returns the complete master list of predefined permissions.
var AllPermissions = []Definition{
	// Personal Features
	{
		Code:        UrlsRead,
		Module:      "urls",
		Action:      "read",
		Description: "View personal short URLs list and details",
	},
	{
		Code:        UrlsCreate,
		Module:      "urls",
		Action:      "create",
		Description: "Create new short URLs",
	},
	{
		Code:        UrlsUpdate,
		Module:      "urls",
		Action:      "update",
		Description: "Edit personal short URL details and destinations",
	},
	{
		Code:        UrlsDelete,
		Module:      "urls",
		Action:      "delete",
		Description: "Delete or soft-delete personal short URLs",
	},
	{
		Code:        AnalyticsRead,
		Module:      "analytics",
		Action:      "read",
		Description: "View real-time click traffic and audience analytics",
	},

	// Administration & Governance
	{
		Code:        AdminDashboardRead,
		Module:      "dashboard",
		Action:      "read",
		Description: "View executive admin dashboard and metrics",
	},
	{
		Code:        UsersRead,
		Module:      "users",
		Action:      "read",
		Description: "View users list and account details",
	},
	{
		Code:        UsersSuspend,
		Module:      "users",
		Action:      "suspend",
		Description: "Suspend or unsuspend user accounts",
	},
	{
		Code:        UsersRolesUpdate,
		Module:      "users",
		Action:      "update_role",
		Description: "Change assigned role of users",
	},
	{
		Code:        UsersSessionsRevoke,
		Module:      "users",
		Action:      "revoke_session",
		Description: "Revoke active sessions of users",
	},
	{
		Code:        RolesRead,
		Module:      "roles",
		Action:      "read",
		Description: "View roles and permission matrices",
	},
	{
		Code:        RolesCreate,
		Module:      "roles",
		Action:      "create",
		Description: "Create custom roles",
	},
	{
		Code:        RolesPermissionsUpdate,
		Module:      "roles",
		Action:      "update_permissions",
		Description: "Update role permissions mapping",
	},
	{
		Code:        LinksRead,
		Module:      "links",
		Action:      "read",
		Description: "View global URLs list",
	},
	{
		Code:        LinksBan,
		Module:      "links",
		Action:      "ban",
		Description: "Ban or unban malicious short links global oversight",
	},
	{
		Code:        AuditRead,
		Module:      "audit",
		Action:      "read",
		Description: "View security audit trail logs",
	},
	{
		Code:        SystemConfigRead,
		Module:      "system",
		Action:      "read_config",
		Description: "View system configurations and feature flags",
	},
	{
		Code:        SystemConfigUpdate,
		Module:      "system",
		Action:      "update_config",
		Description: "Modify system configurations and feature flags",
	},
	{
		Code:        TenantsRead,
		Module:      "tenants",
		Action:      "read",
		Description: "View platform tenants list and details",
	},
	{
		Code:        TenantsCreate,
		Module:      "tenants",
		Action:      "create",
		Description: "Create new platform tenants",
	},
	{
		Code:        TenantsUpdate,
		Module:      "tenants",
		Action:      "update",
		Description: "Update tenant configurations",
	},
	{
		Code:        TenantsDelete,
		Module:      "tenants",
		Action:      "delete",
		Description: "Delete platform tenants",
	},
	{
		Code:        TenantsMembersManage,
		Module:      "tenants",
		Action:      "manage_members",
		Description: "Manage tenant membership and roles",
	},
}

// UserDefaultPermissions are permissions automatically assigned to standard regular users
var UserDefaultPermissions = []string{
	UrlsRead,
	UrlsCreate,
	UrlsUpdate,
	UrlsDelete,
	AnalyticsRead,
}

// SyncPermissions ensures system default tenant roles hold their designated permissions.
func SyncPermissions(ctx context.Context, q db.Querier) error {
	for _, roleName := range []string{"owner", "admin"} {
		role, err := q.GetRoleByName(ctx, roleName)
		if err != nil {
			continue
		}
		for _, perm := range AllPermissions {
			_ = q.AddRolePermission(ctx, db.AddRolePermissionParams{
				RoleID:         role.ID,
				PermissionCode: perm.Code,
			})
		}
	}

	memberRole, err := q.GetRoleByName(ctx, "member")
	if err == nil {
		for _, code := range UserDefaultPermissions {
			_ = q.AddRolePermission(ctx, db.AddRolePermissionParams{
				RoleID:         memberRole.ID,
				PermissionCode: code,
			})
		}
	}

	return nil
}
