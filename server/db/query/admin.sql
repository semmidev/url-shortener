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

-- name: GetSystemStats :one
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM short_urls WHERE deleted_at IS NULL) AS total_urls,
    (SELECT COUNT(*) FROM short_urls WHERE deleted_at IS NULL AND is_active = TRUE) AS total_active_urls,
    (SELECT COALESCE(SUM(click_count), 0)::bigint FROM short_urls) AS total_clicks;
