package user

import (
	"errors"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

// Role represents user authorization roles in domain and RBAC context.
type Role string

const (
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleUser   Role = "user"
)

var (
	ErrUserNotFound           = errors.New("user not found")
	ErrEmailAlreadyRegistered = errors.New("email is already registered")
	ErrInvalidCredentials     = errors.New("invalid email or password")
	ErrAccountSuspended       = errors.New("account is suspended")
)

// User wraps the sqlc db.User model to attach rich domain behavior without duplicating field declarations.
type User struct {
	db.User
}

// IsActive returns true if the user account is not suspended.
func (u *User) IsActive() bool {
	return !u.IsSuspended
}

// HasPasswordSet returns true if the user has a valid local password hash.
func (u *User) HasPasswordSet() bool {
	return u.PasswordHash.Valid && u.PasswordHash.String != ""
}

// IsGoogleLinked returns true if the user account is connected with Google OAuth.
func (u *User) IsGoogleLinked() bool {
	return u.GoogleID.Valid && u.GoogleID.String != ""
}
