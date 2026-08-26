package admin

import (
	"encoding/json"
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type ListUsersRequest struct {
	Filter web.Filter
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
	Users []AdminUserResponse `json:"users"`
	Meta  web.Meta            `json:"meta"`
}

type SuspendUserRequest struct {
	UserID      uuid.UUID `json:"-"`
	IsSuspended bool      `json:"is_suspended"`
}

type UpdateUserRoleRequest struct {
	UserID uuid.UUID `json:"-"`
	Role   string    `json:"role"`
}

type SystemStatsResponse struct {
	TotalUsers      int64 `json:"total_users"`
	TotalURLs       int64 `json:"total_urls"`
	TotalActiveURLs int64 `json:"total_active_urls"`
	TotalClicks     int64 `json:"total_clicks"`
}

type RoleResponse struct {
	ID          uuid.UUID            `json:"id"`
	Name        string               `json:"name"`
	DisplayName string               `json:"display_name"`
	Description string               `json:"description"`
	IsSystem    bool                 `json:"is_system"`
	Permissions []PermissionResponse `json:"permissions"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

type PermissionResponse struct {
	ID          uuid.UUID `json:"id"`
	Code        string    `json:"code"`
	Module      string    `json:"module"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"display_name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type UpdateRolePermissionsRequest struct {
	Permissions []string `json:"permissions"`
}

type NavigationMenuResponse struct {
	ID             uuid.UUID                `json:"id"`
	ParentID       *uuid.UUID               `json:"parent_id"`
	Title          string                   `json:"title"`
	TitleID        string                   `json:"title_id"`
	TitleEN        string                   `json:"title_en"`
	Path           string                   `json:"path"`
	Icon           string                   `json:"icon"`
	OrderIndex     int32                    `json:"order_index"`
	IsActive       bool                     `json:"is_active"`
	IsExternal     bool                     `json:"is_external"`
	IsGroup        bool                     `json:"is_group"`
	BadgeText      string                   `json:"badge_text"`
	PermissionCode *string                  `json:"permission_code"`
	Children       []NavigationMenuResponse `json:"children,omitempty"`
	CreatedAt      time.Time                `json:"created_at"`
	UpdatedAt      time.Time                `json:"updated_at"`
}

type CreateMenuRequest struct {
	ParentID       *uuid.UUID `json:"parent_id"`
	Title          string     `json:"title"`
	TitleID        string     `json:"title_id"`
	TitleEN        string     `json:"title_en"`
	Path           string     `json:"path"`
	Icon           string     `json:"icon"`
	OrderIndex     int32      `json:"order_index"`
	IsActive       bool       `json:"is_active"`
	IsExternal     bool       `json:"is_external"`
	IsGroup        bool       `json:"is_group"`
	BadgeText      string     `json:"badge_text"`
	PermissionCode *string    `json:"permission_code"`
}

type UpdateMenuRequest struct {
	ParentID       *uuid.UUID `json:"parent_id"`
	Title          string     `json:"title"`
	TitleID        string     `json:"title_id"`
	TitleEN        string     `json:"title_en"`
	Path           string     `json:"path"`
	Icon           string     `json:"icon"`
	OrderIndex     int32      `json:"order_index"`
	IsActive       bool       `json:"is_active"`
	IsExternal     bool       `json:"is_external"`
	IsGroup        bool       `json:"is_group"`
	BadgeText      string     `json:"badge_text"`
	PermissionCode *string    `json:"permission_code"`
}

type ReorderMenuItem struct {
	ID         uuid.UUID  `json:"id"`
	ParentID   *uuid.UUID `json:"parent_id"`
	OrderIndex int32      `json:"order_index"`
}

type ReorderMenusRequest struct {
	Items []ReorderMenuItem `json:"items"`
}

type GlobalLinkResponse struct {
	ID          uuid.UUID  `json:"id"`
	UserID      *uuid.UUID `json:"user_id"`
	UserEmail   string     `json:"user_email"`
	ShortCode   string     `json:"short_code"`
	OriginalURL string     `json:"original_url"`
	Title       string     `json:"title"`
	IsActive    bool       `json:"is_active"`
	ClickCount  int64      `json:"click_count"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ListGlobalLinksResponse struct {
	Links []GlobalLinkResponse `json:"links"`
	Meta  web.Meta             `json:"meta"`
}

type BanURLRequest struct {
	IsActive bool `json:"is_active"`
}

type AuditLogResponse struct {
	ID         uuid.UUID       `json:"id"`
	ActorID    *uuid.UUID      `json:"actor_id"`
	ActorEmail string          `json:"actor_email"`
	Action     string          `json:"action"`
	Resource   string          `json:"resource"`
	ResourceID string          `json:"resource_id"`
	Payload    json.RawMessage `json:"payload"`
	IPAddress  string          `json:"ip_address"`
	UserAgent  string          `json:"user_agent"`
	CreatedAt  time.Time       `json:"created_at"`
}

type ListAuditLogsResponse struct {
	Logs []AuditLogResponse `json:"logs"`
	Meta web.Meta           `json:"meta"`
}

type SystemConfigResponse struct {
	Key         string          `json:"key"`
	Value       json.RawMessage `json:"value"`
	Description string          `json:"description"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type UpdateSystemConfigRequest struct {
	Value       json.RawMessage `json:"value"`
	Description string          `json:"description"`
}
