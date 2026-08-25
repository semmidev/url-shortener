package url

import (
	"crypto/rand"
	"math/big"
	"net"
	"net/url"
	"strings"
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/validator"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

// blockedURLSchemes lists dangerous URI schemes that must never be shortened.
var blockedURLSchemes = map[string]bool{
	"javascript": true,
	"data":       true,
	"vbscript":   true,
	"file":       true,
	"blob":       true,
}

// validateURLScheme returns an error if the URL uses a dangerous scheme or targets loopback/private IPs (SSRF protection).
func validateURLScheme(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return apperr.Invalid("original_url is not a valid URL")
	}
	if blockedURLSchemes[strings.ToLower(u.Scheme)] {
		return apperr.Invalid("original_url scheme '" + u.Scheme + "' is not allowed")
	}

	host := strings.ToLower(u.Hostname())
	if host == "localhost" || host == "0.0.0.0" {
		return apperr.Invalid("original_url cannot target local system hostnames")
	}

	ip := net.ParseIP(host)
	if ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsLinkLocalUnicast() {
			return apperr.Invalid("original_url cannot target private or loopback IP addresses")
		}
	}
	return nil
}

// GenerateRandomCode generates a random Base62 string of specified length.
func GenerateRandomCode(length int) (string, error) {
	result := make([]byte, length)
	charLen := big.NewInt(int64(len(Base62Chars)))
	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, charLen)
		if err != nil {
			return "", err
		}
		result[i] = Base62Chars[num.Int64()]
	}
	return string(result), nil
}

type CreateURLRequest struct {
	OriginalURL string     `json:"original_url" validate:"required,http_url"`
	CustomCode  string     `json:"custom_code,omitempty" validate:"omitempty,min=3,max=50,alphanum_dash"`
	Title       string     `json:"title,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	UserID      *uuid.UUID `json:"-"`
}

func (r *CreateURLRequest) Validate() error {
	if err := validator.Check(r); err != nil {
		return err
	}
	if err := validateURLScheme(r.OriginalURL); err != nil {
		return err
	}
	if r.ExpiresAt != nil && r.ExpiresAt.Before(time.Now()) {
		return apperr.Invalid("expires_at must be a future timestamp")
	}
	return nil
}

type GetURLByCodeRequest struct {
	Code string `json:"code"`
}

type GetURLByIDRequest struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type ListUserShortURLsRequest struct {
	UserID uuid.UUID  `json:"-"`
	Filter web.Filter `json:"filter"`
}

type UpdateURLRequest struct {
	ID          uuid.UUID  `json:"-"`
	UserID      uuid.UUID  `json:"-"`
	Title       *string    `json:"title,omitempty"`
	OriginalURL *string    `json:"original_url,omitempty" validate:"omitempty,http_url"`
	IsActive    *bool      `json:"is_active,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

func (r *UpdateURLRequest) Validate() error {
	if err := validator.Check(r); err != nil {
		return err
	}
	if r.OriginalURL != nil {
		if err := validateURLScheme(*r.OriginalURL); err != nil {
			return err
		}
	}
	return nil
}

type DeleteURLRequest struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type DeleteURLResponse struct {
	Message string `json:"message"`
}

type RestoreURLRequest struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
}

type IncrementClickCountRequest struct {
	ID uuid.UUID `json:"id"`
}

type MetaResponse struct {
	Page          int32  `json:"page"`
	Limit         int32  `json:"limit"`
	Total         int64  `json:"total"`
	Search        string `json:"search,omitempty"`
	SortBy        string `json:"sort_by,omitempty"`
	SortDirection string `json:"sort_direction,omitempty"`
}

type ListURLResponse struct {
	Items []URLResponse `json:"items"`
	Meta  MetaResponse  `json:"meta"`
}

type URLResponse struct {
	ID          uuid.UUID  `json:"id"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	ShortCode   string     `json:"short_code"`
	ShortURL    string     `json:"short_url"`
	OriginalURL string     `json:"original_url"`
	Title       string     `json:"title"`
	IsActive    bool       `json:"is_active"`
	ClickCount  int64      `json:"click_count"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
