ALTER TABLE short_urls ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_short_urls_deleted_at ON short_urls(deleted_at) WHERE deleted_at IS NULL;
