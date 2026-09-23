-- =============================================================================
-- Migration 000004 Down: Rollback Soft Delete (deleted_at) columns
-- =============================================================================

DROP INDEX IF EXISTS idx_roles_deleted_at;
ALTER TABLE roles DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_users_deleted_at;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_tenants_deleted_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS deleted_at;
