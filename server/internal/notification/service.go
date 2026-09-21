package notification

import (
	"context"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

type Service struct {
	q db.Querier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

func (s *Service) CreateNotification(ctx context.Context, req CreateNotificationRequest) (NotificationResponse, error) {
	if req.Title == "" || req.Message == "" {
		return NotificationResponse{}, apperr.Invalid("title and message are required")
	}
	if req.Type == "" {
		req.Type = "system"
	}

	n, err := s.q.CreateNotification(ctx, db.CreateNotificationParams{
		UserID:  req.UserID,
		Title:   req.Title,
		Message: req.Message,
		Type:    req.Type,
	})
	if err != nil {
		return NotificationResponse{}, apperr.Internal("failed to create notification", err)
	}

	return ToNotificationResponse(n), nil
}

func (s *Service) ListNotifications(ctx context.Context, userID uuid.UUID, page, limit int32, unreadOnly bool, nType, search string) (ListNotificationsResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var unreadParam pgtype.Bool
	if unreadOnly {
		unreadParam = pgtype.Bool{Bool: true, Valid: true}
	}

	var typeParam pgtype.Text
	if nType != "" && nType != "all" {
		typeParam = pgtype.Text{String: nType, Valid: true}
	}

	var searchParam pgtype.Text
	if search != "" {
		searchParam = pgtype.Text{String: search, Valid: true}
	}

	items, err := s.q.ListUserNotifications(ctx, db.ListUserNotificationsParams{
		UserID:     userID,
		UnreadOnly: unreadParam,
		Type:       typeParam,
		Search:     searchParam,
		OffsetVal:  offset,
		LimitVal:   limit,
	})
	if err != nil {
		return ListNotificationsResponse{}, apperr.Internal("failed to list notifications", err)
	}

	total, err := s.q.CountUserNotifications(ctx, db.CountUserNotificationsParams{
		UserID:     userID,
		UnreadOnly: unreadParam,
		Type:       typeParam,
		Search:     searchParam,
	})
	if err != nil {
		total = int64(len(items))
	}

	unreadCount, err := s.q.CountUnreadNotifications(ctx, userID)
	if err != nil {
		unreadCount = 0
	}

	resItems := make([]NotificationResponse, len(items))
	for i, item := range items {
		resItems[i] = ToNotificationResponse(item)
	}

	return ListNotificationsResponse{
		Items:       resItems,
		Total:       total,
		Page:        page,
		Limit:       limit,
		UnreadCount: unreadCount,
	}, nil
}

func (s *Service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (UnreadCountResponse, error) {
	count, err := s.q.CountUnreadNotifications(ctx, userID)
	if err != nil {
		return UnreadCountResponse{}, apperr.Internal("failed to count unread notifications", err)
	}
	return UnreadCountResponse{UnreadCount: count}, nil
}

func (s *Service) MarkAsRead(ctx context.Context, userID, notificationID uuid.UUID) (NotificationResponse, error) {
	n, err := s.q.MarkNotificationAsRead(ctx, db.MarkNotificationAsReadParams{
		ID:     notificationID,
		UserID: userID,
	})
	if err != nil {
		return NotificationResponse{}, apperr.NotFound("notification not found")
	}
	return ToNotificationResponse(n), nil
}

func (s *Service) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return s.q.MarkAllNotificationsAsRead(ctx, userID)
}

func (s *Service) DeleteNotification(ctx context.Context, userID, notificationID uuid.UUID) error {
	return s.q.DeleteNotification(ctx, db.DeleteNotificationParams{
		ID:     notificationID,
		UserID: userID,
	})
}

func (s *Service) ClearRead(ctx context.Context, userID uuid.UUID) error {
	return s.q.ClearReadNotifications(ctx, userID)
}
