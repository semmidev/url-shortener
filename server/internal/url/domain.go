package url

import (
	"errors"
	"time"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
)

const (
	// DefaultCodeLength is the standard length for randomly generated Base62 short codes.
	DefaultCodeLength = 7

	// MaxGenerateAttempts is the maximum number of retries to generate a unique short code.
	MaxGenerateAttempts = 5

	// Base62Chars defines the character set used for generating short URL codes.
	Base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
)

var (
	ErrURLNotFound     = errors.New("short url not found")
	ErrURLInactive     = errors.New("short url is inactive")
	ErrURLExpired      = errors.New("short url has expired")
	ErrCustomSlugTaken = errors.New("custom short code slug is already taken")
)

// ShortURL wraps the sqlc db.ShortUrl model to attach rich domain behavior without duplicating field declarations.
type ShortURL struct {
	db.ShortUrl
}

// IsExpired checks whether the short URL has passed its expiration time.
func (u *ShortURL) IsExpired() bool {
	if !u.ExpiresAt.Valid {
		return false
	}
	return time.Now().After(u.ExpiresAt.Time)
}

// IsDeactivated checks whether the short URL is marked inactive or soft-deleted.
func (u *ShortURL) IsDeactivated() bool {
	return !u.IsActive || u.DeletedAt.Valid
}
