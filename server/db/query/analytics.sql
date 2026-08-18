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
