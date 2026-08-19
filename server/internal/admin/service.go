package admin

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

type Service struct {
	store     db.Store
	appLogger *logger.Logger
	cache     cache.Cache
}

func NewService(store db.Store, appLogger *logger.Logger, cache cache.Cache) *Service {
	return &Service{
		store:     store,
		appLogger: appLogger,
		cache:     cache,
	}
}

func (s *Service) ListUsers(ctx context.Context, req ListUsersRequest) (*ListUsersResponse, error) {
	page := req.Filter.Page
	if page < 1 {
		page = 1
	}
	limit := req.Filter.Limit
	if limit < 1 {
		limit = 20
	}
	offset := req.Filter.GetOffset()

	var searchPg pgtype.Text
	if req.Filter.Search != "" {
		searchPg = pgtype.Text{String: req.Filter.Search, Valid: true}
	}

	users, err := s.store.ListAllUsers(ctx, db.ListAllUsersParams{
		Search:    searchPg,
		LimitVal:  limit,
		OffsetVal: offset,
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to list users", "")
	}

	_, err = s.store.CountAllUsers(ctx, searchPg)
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to count users", "")
	}

	items := make([]AdminUserResponse, 0, len(users))
	for _, u := range users {
		items = append(items, AdminUserResponse{
			ID:          u.ID,
			Email:       u.Email,
			FullName:    u.FullName,
			Role:        u.Role,
			IsSuspended: u.IsSuspended,
			CreatedAt:   u.CreatedAt,
			UpdatedAt:   u.UpdatedAt,
		})
	}

	meta := req.Filter
	meta.Page = page
	meta.Limit = limit

	return &ListUsersResponse{
		Items: items,
		Meta:  meta,
	}, nil
}

func (s *Service) SetUserSuspended(ctx context.Context, req SuspendUserRequest) (*AdminUserResponse, error) {
	u, err := s.store.SetUserSuspended(ctx, db.SetUserSuspendedParams{
		ID:          req.UserID,
		IsSuspended: req.IsSuspended,
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "user not found", "")
	}

	s.appLogger.Audit(ctx, "admin.user.suspended", "user_id", u.ID.String(), "is_suspended", u.IsSuspended)

	return &AdminUserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FullName:    u.FullName,
		Role:        u.Role,
		IsSuspended: u.IsSuspended,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}, nil
}

func (s *Service) ForceDeleteURL(ctx context.Context, urlID uuid.UUID) error {
	existing, err := s.store.GetShortURLByID(ctx, urlID)
	if err != nil {
		return apperr.MapDBError(err, "short URL not found", "")
	}

	err = s.store.ExecTx(ctx, func(q *db.Queries) error {
		return q.DeleteShortURL(ctx, db.DeleteShortURLParams{
			ID:     urlID,
			UserID: pgtype.UUID{Valid: false}, // admin override
		})
	})
	if err != nil {
		return apperr.MapDBError(err, "short URL not found", "")
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", existing.ShortCode))
	}

	s.appLogger.Audit(ctx, "admin.url.force_deleted", "url_id", urlID.String())
	return nil
}

func (s *Service) GetSystemStats(ctx context.Context) (*SystemStatsResponse, error) {
	stats, err := s.store.GetSystemStats(ctx)
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to retrieve system stats", "")
	}

	return &SystemStatsResponse{
		TotalUsers:      stats.TotalUsers,
		TotalURLs:       stats.TotalUrls,
		TotalActiveURLs: stats.TotalActiveUrls,
		TotalClicks:     stats.TotalClicks,
	}, nil
}
