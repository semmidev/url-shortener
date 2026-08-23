package admin

import (
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type ListUsersRequest struct {
	Filter web.Filter `json:"filter"`
}

type AdminUserResponse struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	FullName    string    `json:"full_name"`
	Role        string    `json:"role"`
	IsSuspended bool      `json:"is_suspended"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ListUsersResponse struct {
	Items []AdminUserResponse `json:"items"`
	Meta  web.Filter          `json:"meta"`
}

type SuspendUserRequest struct {
	UserID      uuid.UUID `json:"-"`
	IsSuspended bool      `json:"is_suspended"`
}

type SystemStatsResponse struct {
	TotalUsers      int64 `json:"total_users"`
	TotalURLs       int64 `json:"total_urls"`
	TotalActiveURLs int64 `json:"total_active_urls"`
	TotalClicks     int64 `json:"total_clicks"`
}
