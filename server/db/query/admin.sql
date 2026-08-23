-- name: ListAllUsers :many
SELECT id, email, full_name, role, is_suspended, created_at, updated_at
FROM users
WHERE (sqlc.narg('search')::text IS NULL OR (
    email ILIKE '%' || sqlc.narg('search')::text || '%' OR
    full_name ILIKE '%' || sqlc.narg('search')::text || '%'
))
ORDER BY created_at DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountAllUsers :one
SELECT COUNT(*) FROM users
WHERE (sqlc.narg('search')::text IS NULL OR (
    email ILIKE '%' || sqlc.narg('search')::text || '%' OR
    full_name ILIKE '%' || sqlc.narg('search')::text || '%'
));

-- name: SetUserSuspended :one
UPDATE users
SET is_suspended = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, full_name, role, is_suspended, created_at, updated_at;

-- name: UpdateUserRole :one
UPDATE users
SET role = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, full_name, role, is_suspended, created_at, updated_at;

-- name: GetSystemStats :one
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM short_urls WHERE deleted_at IS NULL) AS total_urls,
    (SELECT COUNT(*) FROM short_urls WHERE deleted_at IS NULL AND is_active = TRUE) AS total_active_urls,
    (SELECT COALESCE(SUM(click_count), 0)::bigint FROM short_urls) AS total_clicks;

-- name: ListGlobalLinks :many
SELECT s.id, s.user_id, u.email as user_email, s.short_code, s.original_url, s.title, s.is_active, s.click_count, s.expires_at, s.created_at, s.updated_at
FROM short_urls s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deleted_at IS NULL AND (sqlc.narg('search')::text IS NULL OR (
    s.short_code ILIKE '%' || sqlc.narg('search')::text || '%' OR
    s.original_url ILIKE '%' || sqlc.narg('search')::text || '%' OR
    s.title ILIKE '%' || sqlc.narg('search')::text || '%' OR
    u.email ILIKE '%' || sqlc.narg('search')::text || '%'
))
ORDER BY s.created_at DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountGlobalLinks :one
SELECT COUNT(*)
FROM short_urls s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deleted_at IS NULL AND (sqlc.narg('search')::text IS NULL OR (
    s.short_code ILIKE '%' || sqlc.narg('search')::text || '%' OR
    s.original_url ILIKE '%' || sqlc.narg('search')::text || '%' OR
    s.title ILIKE '%' || sqlc.narg('search')::text || '%' OR
    u.email ILIKE '%' || sqlc.narg('search')::text || '%'
));

-- name: SetURLActiveStatus :one
UPDATE short_urls
SET is_active = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, short_code, original_url, is_active, updated_at;
