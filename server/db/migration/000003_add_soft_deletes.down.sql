DROP INDEX IF EXISTS idx_short_urls_deleted_at;
ALTER TABLE short_urls DROP COLUMN IF EXISTS deleted_at;
