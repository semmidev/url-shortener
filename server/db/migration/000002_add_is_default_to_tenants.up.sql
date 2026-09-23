ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure the first/oldest workspace owned by each user is marked as default
UPDATE tenants t
SET is_default = TRUE
WHERE t.id IN (
    SELECT DISTINCT ON (tm.user_id) tm.tenant_id
    FROM tenant_memberships tm
    JOIN tenants t2 ON t2.id = tm.tenant_id
    WHERE tm.role = 'owner'
    ORDER BY tm.user_id, t2.created_at ASC
);
