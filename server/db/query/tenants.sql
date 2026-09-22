-- name: CreateTenant :one
INSERT INTO tenants (
    name,
    slug,
    join_code
) VALUES (
    $1, $2, $3
)
RETURNING id, name, slug, join_code, created_at, updated_at;

-- name: GetTenantByID :one
SELECT id, name, slug, join_code, created_at, updated_at
FROM tenants
WHERE id = $1 LIMIT 1;

-- name: GetTenantBySlug :one
SELECT id, name, slug, join_code, created_at, updated_at
FROM tenants
WHERE slug = $1 LIMIT 1;

-- name: GetTenantByJoinCode :one
SELECT id, name, slug, join_code, created_at, updated_at
FROM tenants
WHERE join_code = $1 LIMIT 1;

-- name: ListUserTenants :many
SELECT t.id, t.name, t.slug, t.join_code, tm.role, t.created_at, t.updated_at
FROM tenants t
JOIN tenant_memberships tm ON t.id = tm.tenant_id
WHERE tm.user_id = $1
ORDER BY t.created_at ASC;

-- name: AddTenantMember :one
INSERT INTO tenant_memberships (
    tenant_id,
    user_id,
    role
) VALUES (
    $1, $2, $3
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    role = EXCLUDED.role
RETURNING tenant_id, user_id, role, created_at;

-- name: GetTenantMembership :one
SELECT tenant_id, user_id, role, created_at
FROM tenant_memberships
WHERE tenant_id = $1 AND user_id = $2 LIMIT 1;

-- name: ListTenantMembers :many
SELECT u.id as user_id, u.email, u.full_name, u.avatar_url, tm.role, tm.created_at
FROM tenant_memberships tm
JOIN users u ON u.id = tm.user_id
WHERE tm.tenant_id = $1
ORDER BY tm.created_at ASC;

-- name: UpdateTenantMemberRole :one
UPDATE tenant_memberships
SET role = $3
WHERE tenant_id = $1 AND user_id = $2
RETURNING tenant_id, user_id, role, created_at;

-- name: RemoveTenantMember :exec
DELETE FROM tenant_memberships
WHERE tenant_id = $1 AND user_id = $2;

-- name: ListAllTenantsAdmin :many
SELECT t.id, t.name, t.slug, t.join_code, t.created_at, t.updated_at,
       COUNT(tm.user_id)::bigint AS member_count
FROM tenants t
LEFT JOIN tenant_memberships tm ON t.id = tm.tenant_id
WHERE (sqlc.narg('search')::text IS NULL OR (
    t.name ILIKE '%' || sqlc.narg('search')::text || '%' OR
    t.slug ILIKE '%' || sqlc.narg('search')::text || '%' OR
    t.join_code ILIKE '%' || sqlc.narg('search')::text || '%'
))
GROUP BY t.id
ORDER BY t.created_at DESC
LIMIT sqlc.arg('limit_val') OFFSET sqlc.arg('offset_val');

-- name: CountAllTenantsAdmin :one
SELECT COUNT(*) FROM tenants t
WHERE (sqlc.narg('search')::text IS NULL OR (
    t.name ILIKE '%' || sqlc.narg('search')::text || '%' OR
    t.slug ILIKE '%' || sqlc.narg('search')::text || '%' OR
    t.join_code ILIKE '%' || sqlc.narg('search')::text || '%'
));

-- name: DeleteTenantAdmin :exec
DELETE FROM tenants WHERE id = $1;

-- name: ListAllTenantMemberships :many
SELECT tenant_id, user_id, role, created_at
FROM tenant_memberships;

-- name: UpdateTenant :one
UPDATE tenants
SET name = COALESCE(sqlc.narg('name')::text, name),
    slug = COALESCE(sqlc.narg('slug')::text, slug),
    updated_at = NOW()
WHERE id = $1
RETURNING id, name, slug, join_code, created_at, updated_at;

-- name: RegenerateTenantJoinCode :one
UPDATE tenants
SET join_code = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING id, name, slug, join_code, created_at, updated_at;
