package authz

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"uuid"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

const (
	DefaultDomain = "global"

	DefaultModelText = `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && (r.dom == p.dom || p.dom == "*") && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)
`
)

// Authorizer defines the interface for authorization decisions and policy synchronization.
type Authorizer interface {
	Can(ctx context.Context, userID uuid.UUID, domain string, permissionCode string) (bool, error)
	Enforce(ctx context.Context, sub string, dom string, obj string, act string) (bool, error)
	GetPermissionsForUser(ctx context.Context, userID uuid.UUID, domain string) ([]string, error)
	SyncPolicies(ctx context.Context) error
	AddUserRole(ctx context.Context, userID uuid.UUID, roleName string, domain string) error
}

// CasbinAuthorizer is an implementation of Authorizer using Casbin SyncedEnforcer.
type CasbinAuthorizer struct {
	enforcer *casbin.SyncedEnforcer
	querier  db.Querier
	permMap  map[string]permission.Definition
	mu       sync.RWMutex
}

// NewCasbinAuthorizer creates and initializes a new CasbinAuthorizer instance.
func NewCasbinAuthorizer(querier db.Querier) (*CasbinAuthorizer, error) {
	m, err := model.NewModelFromString(DefaultModelText)
	if err != nil {
		return nil, fmt.Errorf("failed to parse casbin model: %w", err)
	}

	e, err := casbin.NewSyncedEnforcer(m)
	if err != nil {
		return nil, fmt.Errorf("failed to create casbin enforcer: %w", err)
	}

	pMap := make(map[string]permission.Definition, len(permission.AllPermissions))
	for _, p := range permission.AllPermissions {
		pMap[p.Code] = p
	}

	ca := &CasbinAuthorizer{
		enforcer: e,
		querier:  querier,
		permMap:  pMap,
	}

	if querier != nil {
		if err := ca.SyncPolicies(context.Background()); err != nil {
			_ = err
		}
	}

	return ca, nil
}

// resolvePermCode maps a permission code (e.g. "urls.read") to its module (obj) and action (act).
func (ca *CasbinAuthorizer) resolvePermCode(code string) (obj, act string) {
	if def, ok := ca.permMap[code]; ok {
		return def.Module, def.Action
	}
	parts := strings.SplitN(code, ".", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return code, "access"
}

// resolveDomain resolves active domain from explicit parameter or request context.
func resolveDomain(ctx context.Context, domain string) string {
	if domain != "" && domain != DefaultDomain {
		return domain
	}
	if tenantID, ok := web.TenantID(ctx); ok && tenantID != (uuid.UUID{}) {
		return tenantID.String()
	}
	if domain == "" {
		return DefaultDomain
	}
	return domain
}

// Can checks if a user has permission to perform an action represented by permissionCode.
func (ca *CasbinAuthorizer) Can(ctx context.Context, userID uuid.UUID, domain string, permissionCode string) (bool, error) {
	dom := resolveDomain(ctx, domain)
	obj, act := ca.resolvePermCode(permissionCode)
	sub := userID.String()

	// Ensure user role is strictly synced from DB for this domain
	if ca.querier != nil {
		if tID, err := uuid.Parse(dom); err == nil {
			_, _ = ca.enforcer.DeleteRolesForUserInDomain(sub, dom)
			m, err := ca.querier.GetTenantMembership(ctx, db.GetTenantMembershipParams{TenantID: tID, UserID: userID})
			if err == nil && m.Role != "" {
				_, _ = ca.enforcer.AddGroupingPolicy(sub, m.Role, dom)
			}
		}
	}

	return ca.Enforce(ctx, sub, dom, obj, act)
}

// Enforce directly evaluates a Casbin request (sub, dom, obj, act).
func (ca *CasbinAuthorizer) Enforce(ctx context.Context, sub string, dom string, obj string, act string) (bool, error) {
	dom = resolveDomain(ctx, dom)
	ok, err := ca.enforcer.Enforce(sub, dom, obj, act)
	if err != nil {
		return false, fmt.Errorf("casbin enforcement error: %w", err)
	}
	return ok, nil
}

// GetPermissionsForUser returns all allowed permission codes for a given user in a domain.
func (ca *CasbinAuthorizer) GetPermissionsForUser(ctx context.Context, userID uuid.UUID, domain string) ([]string, error) {
	dom := resolveDomain(ctx, domain)
	allowed := make([]string, 0, len(permission.AllPermissions))

	for _, perm := range permission.AllPermissions {
		can, err := ca.Can(ctx, userID, dom, perm.Code)
		if err != nil {
			return nil, err
		}
		if can {
			allowed = append(allowed, perm.Code)
		}
	}

	return allowed, nil
}

// AddUserRole assigns a role to a user in Casbin for a specific domain.
func (ca *CasbinAuthorizer) AddUserRole(ctx context.Context, userID uuid.UUID, roleName string, domain string) error {
	dom := resolveDomain(ctx, domain)
	sub := userID.String()
	_, _ = ca.enforcer.DeleteRolesForUserInDomain(sub, dom)
	_, err := ca.enforcer.AddGroupingPolicy(sub, roleName, dom)
	if err != nil {
		return fmt.Errorf("failed to add user role grouping: %w", err)
	}
	return nil
}

// SyncPolicies syncs all roles and permissions from the database into Casbin.
func (ca *CasbinAuthorizer) SyncPolicies(ctx context.Context) error {
	ca.mu.Lock()
	defer ca.mu.Unlock()

	if ca.querier == nil {
		return nil
	}

	ca.enforcer.ClearPolicy()
	_, _ = ca.enforcer.RemoveFilteredGroupingPolicy(0)

	// 1. Tenant Owner & Admin default policies
	_, _ = ca.enforcer.AddPolicy("owner", "*", "*", "*", "allow")
	_, _ = ca.enforcer.AddPolicy("admin", "*", "*", "*", "allow")

	// 2. Member role default policies across domains
	for _, permCode := range permission.UserDefaultPermissions {
		obj, act := ca.resolvePermCode(permCode)
		_, _ = ca.enforcer.AddPolicy("member", "*", obj, act, "allow")
		_, _ = ca.enforcer.AddPolicy("user", "*", obj, act, "allow")
	}

	// 3. Fetch custom & system roles & permissions from DB
	roles, err := ca.querier.ListRoles(ctx)
	if err == nil {
		for _, r := range roles {
			perms, err := ca.querier.GetRolePermissions(ctx, r.ID)
			if err != nil {
				continue
			}
			dom := "*"
			if r.TenantID != nil {
				dom = r.TenantID.String()
			}
			for _, permCode := range perms {
				obj, act := ca.resolvePermCode(permCode)
				_, _ = ca.enforcer.AddPolicy(r.Name, dom, obj, act, "allow")
			}
		}
	}

	// 4. Fetch all tenant memberships from DB and populate Casbin grouping policies g(user_id, role, tenant_id)
	memberships, err := ca.querier.ListAllTenantMemberships(ctx)
	if err == nil {
		for _, m := range memberships {
			if m.Role != "" {
				_, _ = ca.enforcer.AddGroupingPolicy(m.UserID.String(), m.Role, m.TenantID.String())
			}
		}
	}

	return nil
}
