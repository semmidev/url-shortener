package tenant

import (
	"errors"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

const (
	JoinCodeLength   = 6
	JoinCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
)

var (
	ErrTenantNotFound    = errors.New("tenant workspace not found")
	ErrSlugAlreadyExists = errors.New("tenant slug already exists")
	ErrJoinCodeInvalid   = errors.New("invalid tenant join code")
	ErrMemberNotFound    = errors.New("tenant member not found")
)

// Tenant wraps the sqlc db.Tenant model to attach rich domain behavior without duplicating field declarations.
type Tenant struct {
	db.Tenant
}
