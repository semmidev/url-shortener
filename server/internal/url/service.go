package url

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

type Service struct {
	store db.Store
	cfg   config.Config
}

func NewService(store db.Store, cfg config.Config) *Service {
	return &Service{
		store: store,
		cfg:   cfg,
	}
}

func (s *Service) toResponse(u db.ShortUrl) URLResponse {
	var expiresAt *time.Time
	if u.ExpiresAt.Valid {
		expiresAt = &u.ExpiresAt.Time
	}

	var userID *uuid.UUID
	if u.UserID.Valid {
		id := uuid.UUID(u.UserID.Bytes)
		userID = &id
	}

	shortURL := fmt.Sprintf("%s/%s", s.cfg.AppBaseURL, u.ShortCode)

	return URLResponse{
		ID:          u.ID,
		UserID:      userID,
		ShortCode:   u.ShortCode,
		ShortURL:    shortURL,
		OriginalURL: u.OriginalUrl,
		Title:       u.Title,
		IsActive:    u.IsActive,
		ClickCount:  u.ClickCount,
		ExpiresAt:   expiresAt,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func (s *Service) Create(ctx context.Context, req CreateURLRequest) (*URLResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	var shortCode string
	if req.CustomCode != "" {
		_, err := s.store.GetShortURLByCode(ctx, req.CustomCode)
		if err == nil {
			return nil, apperr.Conflict(fmt.Sprintf("custom short code '%s' is already in use", req.CustomCode))
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, apperr.MapDBError(err, "", "")
		}
		shortCode = req.CustomCode
	} else {
		// Generate random Base62 short code
		for i := 0; i < MaxGenerateAttempts; i++ {
			code, err := GenerateRandomCode(DefaultCodeLength)
			if err != nil {
				return nil, apperr.Internal("failed to generate short code", err)
			}
			_, err = s.store.GetShortURLByCode(ctx, code)
			if errors.Is(err, pgx.ErrNoRows) {
				shortCode = code
				break
			}
		}
		if shortCode == "" {
			return nil, apperr.Internal(fmt.Sprintf("failed to generate unique short code after %d attempts", MaxGenerateAttempts), nil)
		}
	}

	u, err := s.store.CreateShortURL(ctx, db.CreateShortURLParams{
		UserID:      toPgUUID(req.UserID),
		ShortCode:   shortCode,
		OriginalUrl: req.OriginalURL,
		Title:       req.Title,
		IsActive:    true,
		ExpiresAt:   toPgTimestamptz(req.ExpiresAt),
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to save short URL", "short code is already taken")
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) GetByCode(ctx context.Context, req GetURLByCodeRequest) (*URLResponse, error) {
	u, err := s.store.GetShortURLByCode(ctx, req.Code)
	if err != nil {
		return nil, apperr.MapDBError(err, "short URL not found", "")
	}

	if !u.IsActive {
		return nil, apperr.NotFound("short URL is inactive")
	}

	if u.ExpiresAt.Valid && time.Now().After(u.ExpiresAt.Time) {
		return nil, apperr.NotFound("short URL has expired")
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) GetByID(ctx context.Context, req GetURLByIDRequest) (*URLResponse, error) {
	u, err := s.store.GetShortURLByID(ctx, req.ID)
	if err != nil {
		return nil, apperr.MapDBError(err, "short URL not found", "")
	}

	if u.UserID.Valid && uuid.UUID(u.UserID.Bytes) != req.UserID {
		return nil, apperr.Forbidden("you do not have permission to access this short URL")
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) List(ctx context.Context, req ListUserShortURLsRequest) (*ListURLResponse, error) {
	filter := req.Filter
	userUUID := toPgUUID(&req.UserID)

	var searchVal *string
	if filter.Search != "" {
		searchVal = &filter.Search
	}

	var isActiveVal *bool
	switch filter.Active {
	case 1:
		b := true
		isActiveVal = &b
	case 0:
		b := false
		isActiveVal = &b
	}

	listParams := db.ListUserShortURLsParams{
		UserID:    userUUID,
		Search:    toPgText(searchVal),
		IsActive:  toPgBool(isActiveVal),
		StartDate: toPgTimestamptz(filter.StartDate),
		EndDate:   toPgTimestamptz(filter.EndDate),
		SortBy:    filter.SortKey(),
		LimitVal:  filter.Limit,
		OffsetVal: filter.GetOffset(),
	}

	urls, err := s.store.ListUserShortURLs(ctx, listParams)
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to list short URLs", "")
	}

	countParams := db.CountUserShortURLsParams{
		UserID:    userUUID,
		Search:    toPgText(searchVal),
		IsActive:  toPgBool(isActiveVal),
		StartDate: toPgTimestamptz(filter.StartDate),
		EndDate:   toPgTimestamptz(filter.EndDate),
	}

	total, err := s.store.CountUserShortURLs(ctx, countParams)
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to count short URLs", "")
	}

	res := make([]URLResponse, len(urls))
	for i, u := range urls {
		res[i] = s.toResponse(u)
	}

	return &ListURLResponse{
		Items: res,
		Meta: MetaResponse{
			Page:          filter.Page,
			Limit:         filter.Limit,
			Total:         total,
			Search:        filter.Search,
			SortBy:        filter.SortBy,
			SortDirection: filter.SortDirection,
		},
	}, nil
}

func (s *Service) Update(ctx context.Context, req UpdateURLRequest) (*URLResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Verify ownership first
	_, err := s.GetByID(ctx, GetURLByIDRequest{ID: req.ID, UserID: req.UserID})
	if err != nil {
		return nil, err
	}

	userUUID := toPgUUID(&req.UserID)

	u, err := s.store.UpdateShortURL(ctx, db.UpdateShortURLParams{
		ID:          req.ID,
		Title:       toPgText(req.Title),
		OriginalUrl: toPgText(req.OriginalURL),
		IsActive:    toPgBool(req.IsActive),
		ExpiresAt:   toPgTimestamptz(req.ExpiresAt),
		UserID:      userUUID,
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to update short URL", "")
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) Delete(ctx context.Context, req DeleteURLRequest) (*DeleteURLResponse, error) {
	// Verify ownership first
	_, err := s.GetByID(ctx, GetURLByIDRequest(req))
	if err != nil {
		return nil, err
	}

	userUUID := toPgUUID(&req.UserID)

	// Perform deletion within an atomic database transaction
	err = s.store.ExecTx(ctx, func(q *db.Queries) error {
		return q.DeleteShortURL(ctx, db.DeleteShortURLParams{
			ID:     req.ID,
			UserID: userUUID,
		})
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to delete short URL", "")
	}

	return &DeleteURLResponse{
		Message: "short URL deleted successfully",
	}, nil
}

func (s *Service) IncrementClickCount(ctx context.Context, req IncrementClickCountRequest) error {
	err := s.store.IncrementClickCount(ctx, req.ID)
	if err != nil {
		return apperr.MapDBError(err, "failed to increment click count", "")
	}
	return nil
}

func toPgUUID(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

func toPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func toPgBool(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{Valid: false}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}

func toPgTimestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}
