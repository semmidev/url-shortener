-- name: RecordClick :one
INSERT INTO url_analytics (
    url_id,
    ip_address,
    user_agent,
    referrer,
    device_type,
    country
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetURLAnalyticsSummary :one
SELECT
    COUNT(*)::bigint AS total_clicks,
    COUNT(DISTINCT ip_address)::bigint AS unique_visitors
FROM url_analytics
WHERE url_id = $1;

-- name: ListRecentClicksByUrlID :many
SELECT * FROM url_analytics
WHERE url_id = $1
ORDER BY clicked_at DESC
LIMIT $2 OFFSET $3;

-- name: GetUserDashboardSummary :one
SELECT
    COUNT(DISTINCT u.id)::bigint AS total_urls,
    COALESCE(SUM(u.click_count), 0)::bigint AS total_clicks
FROM short_urls u
WHERE u.user_id = $1;

-- name: GetUserTopReferrers :many
SELECT
    COALESCE(NULLIF(a.referrer, ''), 'direct')::text AS referrer,
    COUNT(*)::bigint AS click_count
FROM url_analytics a
JOIN short_urls u ON a.url_id = u.id
WHERE u.user_id = $1
GROUP BY COALESCE(NULLIF(a.referrer, ''), 'direct')::text
ORDER BY click_count DESC
LIMIT $2;

-- name: GetUserDeviceBreakdown :many
SELECT
    COALESCE(NULLIF(a.device_type, ''), 'unknown')::text AS device_type,
    COUNT(*)::bigint AS click_count
FROM url_analytics a
JOIN short_urls u ON a.url_id = u.id
WHERE u.user_id = $1
GROUP BY COALESCE(NULLIF(a.device_type, ''), 'unknown')::text
ORDER BY click_count DESC;

-- name: GetUserCountryBreakdown :many
SELECT
    COALESCE(NULLIF(a.country, ''), 'unknown')::text AS country,
    COUNT(*)::bigint AS click_count
FROM url_analytics a
JOIN short_urls u ON a.url_id = u.id
WHERE u.user_id = $1
GROUP BY COALESCE(NULLIF(a.country, ''), 'unknown')::text
ORDER BY click_count DESC;
