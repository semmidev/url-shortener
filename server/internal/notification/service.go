package notification

import (
	"context"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

type Service struct {
	q db.Querier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

func (s *Service) CreateNotification(ctx context.Context, req CreateNotificationRequest) (*NotificationResponse, error) {
	if req.Title == "" || req.Message == "" {
		return nil, apperr.Invalid("title and message are required")
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
		return nil, apperr.Internal("failed to create notification", err)
	}

	res := ToNotificationResponse(n)
	return &res, nil
}

func (s *Service) ListNotifications(ctx context.Context, req ListNotificationsRequest) (*ListNotificationsResponse, error) {
	filter := req.Filter
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}
	offset := filter.GetOffset()

	var unreadParam *bool
	if req.UnreadOnly {
		b := true
		unreadParam = &b
	}

	var typeParam *string
	if req.Type != "" && req.Type != "all" {
		typeParam = &req.Type
	}

	var searchParam *string
	if filter.Search != "" {
		searchParam = &filter.Search
	}

	items, err := s.q.ListUserNotifications(ctx, db.ListUserNotificationsParams{
		UserID:     req.UserID,
		UnreadOnly: unreadParam,
		Type:       typeParam,
		Search:     searchParam,
		OffsetVal:  offset,
		LimitVal:   filter.Limit,
	})
	if err != nil {
		return nil, apperr.Internal("failed to list notifications", err)
	}

	total, err := s.q.CountUserNotifications(ctx, db.CountUserNotificationsParams{
		UserID:     req.UserID,
		UnreadOnly: unreadParam,
		Type:       typeParam,
		Search:     searchParam,
	})
	if err != nil {
		total = int64(len(items))
	}

	unreadCount, err := s.q.CountUnreadNotifications(ctx, req.UserID)
	if err != nil {
		unreadCount = 0
	}

	resItems := make([]NotificationResponse, len(items))
	for i, item := range items {
		resItems[i] = ToNotificationResponse(item)
	}

	return &ListNotificationsResponse{
		Items:       resItems,
		Total:       total,
		Page:        filter.Page,
		Limit:       filter.Limit,
		UnreadCount: unreadCount,
	}, nil
}

func (s *Service) GetUnreadCount(ctx context.Context, req GetUnreadCountRequest) (*UnreadCountResponse, error) {
	count, err := s.q.CountUnreadNotifications(ctx, req.UserID)
	if err != nil {
		return nil, apperr.Internal("failed to count unread notifications", err)
	}
	return &UnreadCountResponse{UnreadCount: count}, nil
}

func (s *Service) MarkAsRead(ctx context.Context, req MarkAsReadRequest) (*NotificationResponse, error) {
	n, err := s.q.MarkNotificationAsRead(ctx, db.MarkNotificationAsReadParams{
		ID:     req.NotificationID,
		UserID: req.UserID,
	})
	if err != nil {
		return nil, apperr.NotFound("notification not found")
	}
	res := ToNotificationResponse(n)
	return &res, nil
}

func (s *Service) MarkAllAsRead(ctx context.Context, req MarkAllAsReadRequest) error {
	return s.q.MarkAllNotificationsAsRead(ctx, req.UserID)
}

func (s *Service) DeleteNotification(ctx context.Context, req DeleteNotificationRequest) error {
	return s.q.DeleteNotification(ctx, db.DeleteNotificationParams{
		ID:     req.NotificationID,
		UserID: req.UserID,
	})
}

func (s *Service) ClearRead(ctx context.Context, req ClearReadRequest) error {
	return s.q.ClearReadNotifications(ctx, req.UserID)
}
