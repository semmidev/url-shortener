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

-- name: GetUserRolePermissions :many
SELECT DISTINCT rp.permission_code
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN users u ON u.role = r.name
WHERE u.id = $1;

-- name: CheckUserPermission :one
SELECT EXISTS (
    SELECT 1
    FROM users u
    LEFT JOIN roles r ON u.role = r.name
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    WHERE u.id = $1 AND (
        u.role = 'superadmin' OR
        u.role = 'admin' OR
        r.name = 'superadmin' OR
        r.name = 'admin' OR
        rp.permission_code = $2
    )
) AS has_permission;
