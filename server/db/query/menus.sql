-- name: ListNavigationMenus :many
SELECT id, parent_id, title, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at
FROM navigation_menus
ORDER BY order_index ASC, created_at ASC;

-- name: GetNavigationMenuByID :one
SELECT id, parent_id, title, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at
FROM navigation_menus
WHERE id = $1;

-- name: CreateNavigationMenu :one
INSERT INTO navigation_menus (parent_id, title, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, parent_id, title, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at;

-- name: UpdateNavigationMenu :one
UPDATE navigation_menus
SET parent_id = $2, title = $3, path = $4, icon = $5, order_index = $6, is_active = $7, is_external = $8, is_group = $9, badge_text = $10, permission_code = $11, updated_at = NOW()
WHERE id = $1
RETURNING id, parent_id, title, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at;

-- name: UpdateMenuOrderIndex :exec
UPDATE navigation_menus
SET order_index = $2, parent_id = $3, updated_at = NOW()
WHERE id = $1;

-- name: DeleteNavigationMenu :exec
DELETE FROM navigation_menus
WHERE id = $1;
