-- name: ListSystemConfigs :many
SELECT key, value, description, updated_at
FROM system_configs
ORDER BY key ASC;

-- name: GetSystemConfigByKey :one
SELECT key, value, description, updated_at
FROM system_configs
WHERE key = $1;

-- name: UpsertSystemConfig :one
INSERT INTO system_configs (key, value, description, updated_at)
VALUES (
    sqlc.arg('key')::text,
    sqlc.arg('value')::jsonb,
    sqlc.arg('description')::text,
    NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = COALESCE(NULLIF(EXCLUDED.description, ''), system_configs.description), updated_at = NOW()
RETURNING key, value, description, updated_at;
