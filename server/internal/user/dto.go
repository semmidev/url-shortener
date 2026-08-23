package user

import (
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/validator"
)

type oneTimeCodeEntry struct {
	loginResp *LoginResponse
	expiresAt time.Time
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=6"`
	FullName  string `json:"full_name" validate:"required"`
	UserAgent string `json:"-"`
	ClientIP  string `json:"-"`
}

func (r *RegisterRequest) Validate() error {
	return validator.Check(r)
}

type LoginRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required"`
	UserAgent string `json:"-"`
	ClientIP  string `json:"-"`
}

func (r *LoginRequest) Validate() error {
	return validator.Check(r)
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (r *RefreshTokenRequest) Validate() error {
	return validator.Check(r)
}

type RefreshTokenResponse struct {
	AccessToken          string    `json:"access_token"`
	AccessTokenExpiresAt time.Time `json:"access_token_expires_at"`
}

type GetGoogleLoginURLRequest struct{}

type GoogleAuthURLResponse struct {
	URL string `json:"url"`
}

type HandleGoogleCallbackRequest struct {
	Code      string `json:"code"`
	UserAgent string `json:"-"`
	ClientIP  string `json:"-"`
}

type GoogleExchangeTokenRequest struct {
	Code string `json:"code" validate:"required"`
}

func (r *GoogleExchangeTokenRequest) Validate() error {
	return validator.Check(r)
}

type GetProfileRequest struct {
	UserID uuid.UUID `json:"-"`
}

type UserResponse struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	FullName    string    `json:"full_name"`
	AvatarURL   string    `json:"avatar_url,omitempty"`
	GoogleID    *string   `json:"google_id,omitempty"`
	HasPassword bool      `json:"has_password"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type LoginResponse struct {
	AccessToken           string       `json:"access_token"`
	AccessTokenExpiresAt  time.Time    `json:"access_token_expires_at"`
	RefreshToken          string       `json:"refresh_token"`
	RefreshTokenExpiresAt time.Time    `json:"refresh_token_expires_at"`
	User                  UserResponse `json:"user"`
}

type LogoutRequest struct {
	UserID    uuid.UUID `json:"-"`
	SessionID uuid.UUID `json:"-"`
}

type UpdateProfileRequest struct {
	UserID   uuid.UUID `json:"-"`
	FullName string    `json:"full_name" validate:"required"`
}

func (r *UpdateProfileRequest) Validate() error {
	return validator.Check(r)
}

type ChangePasswordRequest struct {
	UserID      uuid.UUID `json:"-"`
	NewPassword string    `json:"new_password" validate:"required,min=6"`
}

func (r *ChangePasswordRequest) Validate() error {
	return validator.Check(r)
}

type UnlinkGoogleRequest struct {
	UserID uuid.UUID `json:"-"`
}
