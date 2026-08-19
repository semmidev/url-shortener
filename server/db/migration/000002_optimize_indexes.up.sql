-- Enable pg_trgm extension for accelerated ILIKE wildcard searches
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Composite index for fast URL analytics windowing and time-series ordering
CREATE INDEX IF NOT EXISTS idx_url_analytics_url_clicked ON url_analytics (url_id, clicked_at DESC);

-- Trigram GIN indexes for fast full-text substring search on titles and original URLs
CREATE INDEX IF NOT EXISTS idx_short_urls_title_trgm ON short_urls USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_short_urls_original_url_trgm ON short_urls USING gin (original_url gin_trgm_ops);
