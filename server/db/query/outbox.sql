-- name: CreateOutboxEvent :one
INSERT INTO outbox_events (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    status
) VALUES (
    $1, $2, $3, $4, 'PENDING'
)
RETURNING *;

-- name: GetPendingOutboxEvents :many
SELECT * FROM outbox_events
WHERE status = 'PENDING'
ORDER BY created_at ASC
LIMIT $1;

-- name: MarkOutboxEventProcessed :exec
UPDATE outbox_events
SET status = 'PROCESSED', processed_at = NOW()
WHERE id = $1;
