-- name: ListRoles :many
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
ORDER BY is_system DESC, name ASC;

-- name: ListSystemRoles :many
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE tenant_id IS NULL
ORDER BY is_system DESC, name ASC;

-- name: ListTenantRoles :many
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE tenant_id = $1 OR tenant_id IS NULL
ORDER BY is_system DESC, name ASC;

-- name: GetRoleByID :one
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE id = $1;

-- name: GetRoleByName :one
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE name = $1 LIMIT 1;

-- name: GetTenantRoleByName :one
SELECT id, tenant_id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
ORDER BY tenant_id DESC LIMIT 1;

-- name: CreateRole :one
INSERT INTO roles (tenant_id, name, display_name, description, is_system)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, tenant_id, name, display_name, description, is_system, created_at, updated_at;

-- name: UpdateRole :one
UPDATE roles
SET display_name = $2, description = $3, updated_at = NOW()
WHERE id = $1 AND is_system = false
RETURNING id, tenant_id, name, display_name, description, is_system, created_at, updated_at;

-- name: DeleteRole :exec
DELETE FROM roles
WHERE id = $1 AND is_system = false;

-- name: GetRolePermissions :many
SELECT permission_code
FROM role_permissions
WHERE role_id = $1
ORDER BY permission_code ASC;

-- name: ClearRolePermissions :exec
DELETE FROM role_permissions
WHERE role_id = $1;

-- name: AddRolePermission :exec
INSERT INTO role_permissions (role_id, permission_code)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: GetUserTenantPermissions :many
SELECT DISTINCT rp.permission_code
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN tenant_memberships tm ON tm.role = r.name
WHERE tm.user_id = $1 AND tm.tenant_id = $2;
