-- name: CreateAuditLog :one
INSERT INTO audit_logs (actor_id, actor_email, action, resource, resource_id, payload, ip_address, user_agent)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, actor_id, actor_email, action, resource, resource_id, payload, ip_address, user_agent, created_at;

-- name: ListAuditLogs :many
SELECT id, actor_id, actor_email, action, resource, resource_id, payload, ip_address, user_agent, created_at
FROM audit_logs
WHERE (sqlc.narg('search')::text IS NULL OR (
    actor_email ILIKE '%' || sqlc.narg('search')::text || '%' OR
    action ILIKE '%' || sqlc.narg('search')::text || '%' OR
    resource ILIKE '%' || sqlc.narg('search')::text || '%'
))
ORDER BY created_at DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountAuditLogs :one
SELECT COUNT(*)
FROM audit_logs
WHERE (sqlc.narg('search')::text IS NULL OR (
    actor_email ILIKE '%' || sqlc.narg('search')::text || '%' OR
    action ILIKE '%' || sqlc.narg('search')::text || '%' OR
    resource ILIKE '%' || sqlc.narg('search')::text || '%'
));

-- name: GetRecentAuditLogs :many
SELECT id, actor_id, actor_email, action, resource, resource_id, payload, ip_address, user_agent, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT $1;
