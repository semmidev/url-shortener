-- name: CreateUser :one
INSERT INTO users (
    email,
    password_hash,
    full_name,
    role
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByGoogleID :one
SELECT * FROM users
WHERE google_id = $1 LIMIT 1;

-- name: UpsertGoogleUser :one
INSERT INTO users (
    email,
    google_id,
    avatar_url,
    full_name,
    role
) VALUES (
    $1, $2, $3, $4, $5
)
ON CONFLICT (email) DO UPDATE SET
    google_id = EXCLUDED.google_id,
    avatar_url = EXCLUDED.avatar_url,
    full_name = EXCLUDED.full_name,
    updated_at = NOW()
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET
    full_name = COALESCE(sqlc.narg('full_name'), full_name),
    password_hash = COALESCE(sqlc.narg('password_hash'), password_hash),
    avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
    updated_at = NOW()
WHERE id = $1
RETURNING *;
