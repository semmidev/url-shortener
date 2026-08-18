-- name: CreateShortURL :one
INSERT INTO short_urls (
    user_id,
    short_code,
    original_url,
    title,
    is_active,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetShortURLByCode :one
SELECT * FROM short_urls
WHERE short_code = $1 LIMIT 1;

-- name: GetShortURLByID :one
SELECT * FROM short_urls
WHERE id = $1 LIMIT 1;

-- name: ListUserShortURLs :many
SELECT * FROM short_urls
WHERE user_id = sqlc.arg('user_id')
  AND (sqlc.narg('search')::text IS NULL OR (
      title ILIKE '%' || sqlc.narg('search')::text || '%' OR
      short_code ILIKE '%' || sqlc.narg('search')::text || '%' OR
      original_url ILIKE '%' || sqlc.narg('search')::text || '%'
  ))
  AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active')::boolean)
  AND (sqlc.narg('start_date')::timestamptz IS NULL OR created_at >= sqlc.narg('start_date')::timestamptz)
  AND (sqlc.narg('end_date')::timestamptz IS NULL OR created_at <= sqlc.narg('end_date')::timestamptz)
ORDER BY
  CASE WHEN sqlc.arg('sort_by')::text = 'click_count_asc' THEN click_count END ASC,
  CASE WHEN sqlc.arg('sort_by')::text = 'click_count_desc' THEN click_count END DESC,
  CASE WHEN sqlc.arg('sort_by')::text = 'title_asc' THEN title END ASC,
  CASE WHEN sqlc.arg('sort_by')::text = 'title_desc' THEN title END DESC,
  CASE WHEN sqlc.arg('sort_by')::text = 'short_code_asc' THEN short_code END ASC,
  CASE WHEN sqlc.arg('sort_by')::text = 'short_code_desc' THEN short_code END DESC,
  CASE WHEN sqlc.arg('sort_by')::text = 'created_at_asc' THEN created_at END ASC,
  CASE WHEN sqlc.arg('sort_by')::text = 'created_at_desc' OR sqlc.arg('sort_by')::text IS NULL OR sqlc.arg('sort_by')::text = '' THEN created_at END DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountUserShortURLs :one
SELECT COUNT(*) FROM short_urls
WHERE user_id = sqlc.arg('user_id')
  AND (sqlc.narg('search')::text IS NULL OR (
      title ILIKE '%' || sqlc.narg('search')::text || '%' OR
      short_code ILIKE '%' || sqlc.narg('search')::text || '%' OR
      original_url ILIKE '%' || sqlc.narg('search')::text || '%'
  ))
  AND (sqlc.narg('is_active')::boolean IS NULL OR is_active = sqlc.narg('is_active')::boolean)
  AND (sqlc.narg('start_date')::timestamptz IS NULL OR created_at >= sqlc.narg('start_date')::timestamptz)
  AND (sqlc.narg('end_date')::timestamptz IS NULL OR created_at <= sqlc.narg('end_date')::timestamptz);

-- name: UpdateShortURL :one
UPDATE short_urls
SET
    title = COALESCE(sqlc.narg('title'), title),
    original_url = COALESCE(sqlc.narg('original_url'), original_url),
    is_active = COALESCE(sqlc.narg('is_active'), is_active),
    expires_at = COALESCE(sqlc.narg('expires_at'), expires_at),
    updated_at = NOW()
WHERE id = $1 AND (user_id = sqlc.arg('user_id') OR sqlc.arg('user_id') IS NULL)
RETURNING *;

-- name: IncrementClickCount :exec
UPDATE short_urls
SET click_count = click_count + 1,
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteShortURL :exec
DELETE FROM short_urls
WHERE id = $1 AND (user_id = sqlc.arg('user_id') OR sqlc.arg('user_id') IS NULL);
