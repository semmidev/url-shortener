-- name: ListNavigationMenus :many
SELECT id, parent_id, title, title_id, title_en, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at
FROM navigation_menus
ORDER BY order_index ASC, created_at ASC;

-- name: GetNavigationMenuByID :one
SELECT id, parent_id, title, title_id, title_en, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at
FROM navigation_menus
WHERE id = $1;

-- name: CreateNavigationMenu :one
INSERT INTO navigation_menus (parent_id, title, title_id, title_en, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id, parent_id, title, title_id, title_en, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at;

-- name: UpdateNavigationMenu :one
UPDATE navigation_menus
SET parent_id = $2, title = $3, title_id = $4, title_en = $5, path = $6, icon = $7, order_index = $8, is_active = $9, is_external = $10, is_group = $11, badge_text = $12, permission_code = $13, updated_at = NOW()
WHERE id = $1
RETURNING id, parent_id, title, title_id, title_en, path, icon, order_index, is_active, is_external, is_group, badge_text, permission_code, created_at, updated_at;

-- name: UpdateMenuOrderIndex :exec
UPDATE navigation_menus
SET order_index = $2, parent_id = $3, updated_at = NOW()
WHERE id = $1;

-- name: DeleteNavigationMenu :exec
DELETE FROM navigation_menus
WHERE id = $1;
