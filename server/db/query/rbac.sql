-- name: ListRoles :many
SELECT id, name, display_name, description, is_system, created_at, updated_at
FROM roles
ORDER BY is_system DESC, name ASC;

-- name: GetRoleByID :one
SELECT id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE id = $1;

-- name: GetRoleByName :one
SELECT id, name, display_name, description, is_system, created_at, updated_at
FROM roles
WHERE name = $1;

-- name: CreateRole :one
INSERT INTO roles (name, display_name, description, is_system)
VALUES ($1, $2, $3, false)
RETURNING id, name, display_name, description, is_system, created_at, updated_at;

-- name: UpdateRole :one
UPDATE roles
SET display_name = $2, description = $3, updated_at = NOW()
WHERE id = $1 AND is_system = false
RETURNING id, name, display_name, description, is_system, created_at, updated_at;

-- name: DeleteRole :exec
DELETE FROM roles
WHERE id = $1 AND is_system = false;

-- name: ListPermissions :many
SELECT id, code, module, action, description, created_at
FROM permissions
ORDER BY module ASC, code ASC;

-- name: GetRolePermissions :many
SELECT p.id, p.code, p.module, p.action, p.description, p.created_at
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = $1
ORDER BY p.module ASC, p.code ASC;

-- name: ClearRolePermissions :exec
DELETE FROM role_permissions
WHERE role_id = $1;

-- name: AddRolePermission :exec
INSERT INTO role_permissions (role_id, permission_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: GetUserRolePermissions :many
SELECT DISTINCT p.code
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON r.id = rp.role_id
JOIN users u ON u.role = r.name
WHERE u.id = $1;

-- name: CheckUserPermission :one
SELECT EXISTS (
    SELECT 1
    FROM users u
    LEFT JOIN roles r ON u.role = r.name
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = $1 AND (
        u.role = 'superadmin' OR
        u.role = 'admin' OR
        r.name = 'superadmin' OR
        r.name = 'admin' OR
        p.code = $2
    )
) AS has_permission;
