-- name: CreateNotification :one
INSERT INTO notifications (
    user_id,
    title,
    message,
    type
) VALUES (
    $1, $2, $3, $4
)
RETURNING id, user_id, title, message, type, is_read, created_at;

-- name: ListUserNotifications :many
SELECT id, user_id, title, message, type, is_read, created_at
FROM notifications
WHERE user_id = sqlc.arg('user_id')
  AND (sqlc.narg('unread_only')::bool IS NULL OR (sqlc.narg('unread_only')::bool = TRUE AND is_read = FALSE))
  AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type')::text)
  AND (sqlc.narg('search')::text IS NULL OR (
    title ILIKE '%' || sqlc.narg('search')::text || '%' OR
    message ILIKE '%' || sqlc.narg('search')::text || '%'
  ))
ORDER BY created_at DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountUserNotifications :one
SELECT COUNT(*) FROM notifications
WHERE user_id = sqlc.arg('user_id')
  AND (sqlc.narg('unread_only')::bool IS NULL OR (sqlc.narg('unread_only')::bool = TRUE AND is_read = FALSE))
  AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type')::text)
  AND (sqlc.narg('search')::text IS NULL OR (
    title ILIKE '%' || sqlc.narg('search')::text || '%' OR
    message ILIKE '%' || sqlc.narg('search')::text || '%'
  ));

-- name: CountUnreadNotifications :one
SELECT COUNT(*) FROM notifications
WHERE user_id = $1 AND is_read = FALSE;

-- name: MarkNotificationAsRead :one
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, title, message, type, is_read, created_at;

-- name: MarkAllNotificationsAsRead :exec
UPDATE notifications
SET is_read = TRUE
WHERE user_id = $1 AND is_read = FALSE;

-- name: DeleteNotification :exec
DELETE FROM notifications
WHERE id = $1 AND user_id = $2;

-- name: ClearReadNotifications :exec
DELETE FROM notifications
WHERE user_id = $1 AND is_read = TRUE;
