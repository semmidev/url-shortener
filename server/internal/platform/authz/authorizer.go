package authz

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"uuid"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

const (
	DefaultDomain = "global"
)

// Authorizer defines the interface for authorization decisions and policy synchronization.
type Authorizer interface {
	Can(ctx context.Context, userID uuid.UUID, domain string, permissionCode string) (bool, error)
	Enforce(ctx context.Context, sub string, dom string, obj string, act string) (bool, error)
	GetPermissionsForUser(ctx context.Context, userID uuid.UUID, domain string) ([]string, error)
	SyncPolicies(ctx context.Context) error
	AddUserRole(ctx context.Context, userID uuid.UUID, roleName string, domain string) error
}

// SpatieAuthorizer is a Spatie Laravel-Permission style SQL-backed RBAC/ABAC authorizer.
type SpatieAuthorizer struct {
	querier   db.Querier
	permMap   map[string]permission.Definition
	userRoles map[string]string   // key: "userID:domain" -> roleName
	rolePerms map[string][]string // key: "roleName:domain" -> list of permission codes
	mu        sync.RWMutex
}

// NewSpatieAuthorizer creates and initializes a new SpatieAuthorizer instance.
func NewSpatieAuthorizer(querier db.Querier) (*SpatieAuthorizer, error) {
	pMap := make(map[string]permission.Definition, len(permission.AllPermissions))
	for _, p := range permission.AllPermissions {
		pMap[p.Code] = p
	}

	sa := &SpatieAuthorizer{
		querier:   querier,
		permMap:   pMap,
		userRoles: make(map[string]string),
		rolePerms: make(map[string][]string),
	}

	if querier != nil {
		if err := sa.SyncPolicies(context.Background()); err != nil {
			_ = err
		}
	}

	return sa, nil
}

// NewCasbinAuthorizer is an alias constructor for backwards compatibility.
func NewCasbinAuthorizer(querier db.Querier) (*SpatieAuthorizer, error) {
	return NewSpatieAuthorizer(querier)
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
func (sa *SpatieAuthorizer) Can(ctx context.Context, userID uuid.UUID, domain string, permissionCode string) (bool, error) {
	dom := resolveDomain(ctx, domain)
	sub := userID.String()

	// 1. Get user role for this domain
	roleName := sa.getUserRole(ctx, userID, sub, dom)

	// 2. Superadmin / Owner wildcard authorization
	switch strings.ToLower(roleName) {
	case "superadmin", "owner":
		return true, nil
	}

	// 3. Resolve permissions granted to this role / user
	grantedPerms := sa.getGrantedPermissions(roleName, dom)

	// 4. Check if permissionCode is in granted permissions
	for _, granted := range grantedPerms {
		if matchPermission(granted, permissionCode) {
			return true, nil
		}
	}

	return false, nil
}

func (sa *SpatieAuthorizer) getUserRole(ctx context.Context, userID uuid.UUID, sub, dom string) string {
	key := sub + ":" + dom
	sa.mu.RLock()
	r, exists := sa.userRoles[key]
	sa.mu.RUnlock()
	if exists {
		return r
	}

	// Also check wildcard domain key
	sa.mu.RLock()
	rGlobal, existsGlobal := sa.userRoles[sub+":*"]
	sa.mu.RUnlock()
	if existsGlobal {
		return rGlobal
	}

	// Fetch from DB if available
	if sa.querier != nil {
		if tID, err := uuid.Parse(dom); err == nil {
			m, err := sa.querier.GetTenantMembership(ctx, db.GetTenantMembershipParams{TenantID: tID, UserID: userID})
			if err == nil && m.Role != "" {
				sa.mu.Lock()
				sa.userRoles[key] = m.Role
				sa.mu.Unlock()
				return m.Role
			}
		}
	}

	// Default fallback for registered users
	return "user"
}

func (sa *SpatieAuthorizer) getGrantedPermissions(roleName, dom string) []string {
	key := strings.ToLower(roleName) + ":" + dom
	sa.mu.RLock()
	customPerms, found := sa.rolePerms[key]
	if !found {
		customPerms, found = sa.rolePerms[strings.ToLower(roleName)+":*"]
	}
	sa.mu.RUnlock()

	// If explicit permissions exist for this role in DB or memory, use them directly
	if found {
		return customPerms
	}

	// Default fallback permissions for regular member / user role when no explicit permissions are defined
	if strings.EqualFold(roleName, "user") || strings.EqualFold(roleName, "member") {
		return permission.UserDefaultPermissions
	}

	return nil
}

func matchPermission(granted, target string) bool {
	if granted == "*" || target == "*" {
		return true
	}
	if granted == target {
		return true
	}
	// Support module wildcard like "urls.*" matching "urls.read"
	if strings.HasSuffix(granted, ".*") {
		prefix := strings.TrimSuffix(granted, ".*")
		if strings.HasPrefix(target, prefix+".") {
			return true
		}
	}
	return false
}

// Enforce evaluates a permission request based on (sub, dom, obj, act).
func (sa *SpatieAuthorizer) Enforce(ctx context.Context, sub string, dom string, obj string, act string) (bool, error) {
	userID, err := uuid.Parse(sub)
	if err != nil {
		return false, fmt.Errorf("invalid user ID: %w", err)
	}

	var permCode string
	if obj == "*" || act == "*" {
		permCode = "*"
	} else {
		permCode = fmt.Sprintf("%s.%s", obj, act)
	}

	return sa.Can(ctx, userID, dom, permCode)
}

// GetPermissionsForUser returns all allowed permission codes for a user in a domain.
func (sa *SpatieAuthorizer) GetPermissionsForUser(ctx context.Context, userID uuid.UUID, domain string) ([]string, error) {
	dom := resolveDomain(ctx, domain)
	allowed := make([]string, 0, len(permission.AllPermissions))

	for _, perm := range permission.AllPermissions {
		can, err := sa.Can(ctx, userID, dom, perm.Code)
		if err != nil {
			return nil, err
		}
		if can {
			allowed = append(allowed, perm.Code)
		}
	}

	return allowed, nil
}

// AddUserRole assigns a role to a user for a domain.
func (sa *SpatieAuthorizer) AddUserRole(ctx context.Context, userID uuid.UUID, roleName string, domain string) error {
	dom := resolveDomain(ctx, domain)
	key := userID.String() + ":" + dom
	sa.mu.Lock()
	sa.userRoles[key] = roleName
	sa.mu.Unlock()
	return nil
}

// SetRolePermissions explicitly sets granted permissions for a role in a domain.
func (sa *SpatieAuthorizer) SetRolePermissions(roleName, domain string, perms []string) {
	sa.mu.Lock()
	defer sa.mu.Unlock()
	key := strings.ToLower(roleName) + ":" + domain
	sa.rolePerms[key] = perms
}

// SyncPolicies syncs all roles and permissions from the database.
func (sa *SpatieAuthorizer) SyncPolicies(ctx context.Context) error {
	sa.mu.Lock()
	defer sa.mu.Unlock()

	if sa.querier == nil {
		return nil
	}

	sa.userRoles = make(map[string]string)
	sa.rolePerms = make(map[string][]string)

	roles, err := sa.querier.ListRoles(ctx)
	if err == nil {
		for _, r := range roles {
			perms, err := sa.querier.GetRolePermissions(ctx, r.ID)
			if err != nil {
				continue
			}
			dom := "*"
			if r.TenantID != nil {
				dom = r.TenantID.String()
			}
			key := strings.ToLower(r.Name) + ":" + dom
			sa.rolePerms[key] = perms
		}
	}

	memberships, err := sa.querier.ListAllTenantMemberships(ctx)
	if err == nil {
		for _, m := range memberships {
			if m.Role != "" {
				key := m.UserID.String() + ":" + m.TenantID.String()
				sa.userRoles[key] = m.Role
			}
		}
	}

	return nil
}
