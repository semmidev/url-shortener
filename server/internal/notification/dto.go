package notification

import (
	"time"

	"github.com/google/uuid"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type NotificationResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func ToNotificationResponse(n db.Notification) NotificationResponse {
	return NotificationResponse{
		ID:        n.ID,
		UserID:    n.UserID,
		Title:     n.Title,
		Message:   n.Message,
		Type:      n.Type,
		IsRead:    n.IsRead,
		CreatedAt: n.CreatedAt,
	}
}

type ListNotificationsResponse struct {
	Items       []NotificationResponse `json:"items"`
	Total       int64                  `json:"total"`
	Page        int32                  `json:"page"`
	Limit       int32                  `json:"limit"`
	UnreadCount int64                  `json:"unread_count"`
}

type UnreadCountResponse struct {
	UnreadCount int64 `json:"unread_count"`
}

type CreateNotificationRequest struct {
	UserID  uuid.UUID `json:"user_id"`
	Title   string    `json:"title"`
	Message string    `json:"message"`
	Type    string    `json:"type"`
}

type ListNotificationsRequest struct {
	UserID     uuid.UUID  `json:"-"`
	Filter     web.Filter `json:"filter"`
	UnreadOnly bool       `json:"unread_only"`
	Type       string     `json:"type"`
}

type GetUnreadCountRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

type MarkAsReadRequest struct {
	UserID         uuid.UUID `json:"user_id"`
	NotificationID uuid.UUID `json:"notification_id"`
}

type MarkAllAsReadRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

type DeleteNotificationRequest struct {
	UserID         uuid.UUID `json:"user_id"`
	NotificationID uuid.UUID `json:"notification_id"`
}

type ClearReadRequest struct {
	UserID uuid.UUID `json:"user_id"`
}
