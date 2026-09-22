package url

import (
	"context"
	"errors"
	"fmt"
	"time"

	"uuid"

	"github.com/jackc/pgx/v5"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/telemetry"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/worker"
	"go.opentelemetry.io/otel/attribute"
)

type MetricsRecorder interface {
	RecordShortURLCreated(status string)
}

type Service struct {
	store           db.Store
	cfg             config.Config
	cache           cache.Cache
	metrics         MetricsRecorder
	taskDistributor worker.TaskDistributor
	authorizer      authz.Authorizer
}

func NewService(store db.Store, cfg config.Config, c cache.Cache, authorizer authz.Authorizer, taskDistributor worker.TaskDistributor) *Service {
	return &Service{
		store:           store,
		cfg:             cfg,
		cache:           c,
		authorizer:      authorizer,
		taskDistributor: taskDistributor,
	}
}

func (s *Service) SetMetricsRecorder(m MetricsRecorder) {
	if s != nil {
		s.metrics = m
	}
}

func (s *Service) toResponse(u db.ShortUrl) URLResponse {
	shortURL := fmt.Sprintf("%s/%s", s.cfg.AppBaseURL, u.ShortCode)

	return URLResponse{
		ID:          u.ID,
		UserID:      u.UserID,
		ShortCode:   u.ShortCode,
		ShortURL:    shortURL,
		OriginalURL: u.OriginalUrl,
		Title:       u.Title,
		IsActive:    u.IsActive,
		ClickCount:  u.ClickCount,
		ExpiresAt:   u.ExpiresAt,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func (s *Service) Create(ctx context.Context, req CreateURLRequest) (*URLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.Create", attribute.String("url.original_url", req.OriginalURL))
	defer func() { endSpan(err) }()

	if err = req.Validate(); err != nil {
		return nil, err
	}

	if s.authorizer != nil && req.UserID != nil {
		var domain string
		if tID, ok := web.TenantID(ctx); ok {
			domain = tID.String()
		}
		can, _ := s.authorizer.Can(ctx, *req.UserID, domain, permission.UrlsCreate)
		if !can {
			err = apperr.Forbidden("anda tidak memiliki izin untuk membuat link singkat (urls.create)")
			return nil, err
		}
	}

	var shortCode string
	if req.CustomCode != "" {
		_, getErr := s.store.GetShortURLByCode(ctx, req.CustomCode)
		if getErr == nil {
			err = apperr.Conflict(fmt.Sprintf("custom short code '%s' is already in use", req.CustomCode))
			return nil, err
		} else if !errors.Is(getErr, pgx.ErrNoRows) {
			err = apperr.MapDBError(getErr, "", "")
			return nil, err
		}
		shortCode = req.CustomCode
	} else {
		// Generate random Base62 short code
		for i := 0; i < MaxGenerateAttempts; i++ {
			code, genErr := GenerateRandomCode(DefaultCodeLength)
			if genErr != nil {
				err = apperr.Internal("failed to generate short code", genErr)
				return nil, err
			}
			_, genErr = s.store.GetShortURLByCode(ctx, code)
			if errors.Is(genErr, pgx.ErrNoRows) {
				shortCode = code
				break
			}
		}
		if shortCode == "" {
			err = apperr.Internal(fmt.Sprintf("failed to generate unique short code after %d attempts", MaxGenerateAttempts), nil)
			return nil, err
		}
	}

	var tenantID *uuid.UUID
	if tID, ok := web.TenantID(ctx); ok {
		tenantID = &tID
	}

	u, createErr := s.store.CreateShortURL(ctx, db.CreateShortURLParams{
		UserID:      req.UserID,
		TenantID:    tenantID,
		ShortCode:   shortCode,
		OriginalUrl: req.OriginalURL,
		Title:       req.Title,
		IsActive:    true,
		ExpiresAt:   req.ExpiresAt,
	})
	if createErr != nil {
		err = apperr.MapDBError(createErr, "failed to save short URL", "short code is already taken")
		return nil, err
	}

	res := s.toResponse(u)
	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", shortCode))
	}
	if s.metrics != nil {
		s.metrics.RecordShortURLCreated("success")
	}
	return &res, nil
}

func (s *Service) GetByCode(ctx context.Context, req GetURLByCodeRequest) (*URLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.GetByCode", attribute.String("url.short_code", req.Code))
	defer func() { endSpan(err) }()

	cacheKey := fmt.Sprintf("url:code:%s", req.Code)

	if s.cache != nil {
		var cachedResp URLResponse
		if cacheErr := s.cache.Get(ctx, cacheKey, &cachedResp); cacheErr == nil {
			if !cachedResp.IsActive {
				err = apperr.NotFound("short URL is inactive")
				return nil, err
			}
			if cachedResp.ExpiresAt != nil && time.Now().After(*cachedResp.ExpiresAt) {
				err = apperr.NotFound("short URL has expired")
				return nil, err
			}
			return &cachedResp, nil
		}
	}

	u, dbErr := s.store.GetShortURLByCode(ctx, req.Code)
	if dbErr != nil {
		err = apperr.MapDBError(dbErr, "short URL not found", "")
		return nil, err
	}

	if !u.IsActive {
		err = apperr.NotFound("short URL is inactive")
		return nil, err
	}

	if u.ExpiresAt != nil && time.Now().After(*u.ExpiresAt) {
		err = apperr.NotFound("short URL has expired")
		return nil, err
	}

	res := s.toResponse(u)

	if s.cache != nil {
		ttl := s.cfg.CacheTTLShortURL
		if ttl <= 0 {
			ttl = time.Hour
		}
		_ = s.cache.Set(ctx, cacheKey, res, ttl)
	}

	return &res, nil
}

func (s *Service) GetByID(ctx context.Context, req GetURLByIDRequest) (*URLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.GetByID", attribute.String("url.id", req.ID.String()))
	defer func() { endSpan(err) }()

	if s.authorizer != nil {
		var domain string
		if tID, ok := web.TenantID(ctx); ok {
			domain = tID.String()
		}
		can, _ := s.authorizer.Can(ctx, req.UserID, domain, permission.UrlsRead)
		if !can {
			err = apperr.Forbidden("anda tidak memiliki izin untuk melihat link singkat (urls.read)")
			return nil, err
		}
	}

	u, dbErr := s.store.GetShortURLByID(ctx, req.ID)
	if dbErr != nil {
		err = apperr.MapDBError(dbErr, "short URL not found", "")
		return nil, err
	}

	if u.UserID != nil && *u.UserID != req.UserID {
		err = apperr.Forbidden("you do not have permission to access this short URL")
		return nil, err
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) List(ctx context.Context, req ListUserShortURLsRequest) (*ListURLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.List")
	defer func() { endSpan(err) }()

	if s.authorizer != nil {
		var domain string
		if tID, ok := web.TenantID(ctx); ok {
			domain = tID.String()
		}
		can, _ := s.authorizer.Can(ctx, req.UserID, domain, permission.UrlsRead)
		if !can {
			err = apperr.Forbidden("anda tidak memiliki izin untuk melihat daftar link singkat (urls.read)")
			return nil, err
		}
	}

	filter := req.Filter
	var userID *uuid.UUID
	if !req.ScopeAll {
		userID = &req.UserID
	}

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

	var tenantID *uuid.UUID
	if tID, ok := web.TenantID(ctx); ok {
		tenantID = &tID
	}

	listParams := db.ListUserShortURLsParams{
		UserID:    userID,
		TenantID:  tenantID,
		Search:    searchVal,
		IsActive:  isActiveVal,
		StartDate: filter.StartDate,
		EndDate:   filter.EndDate,
		SortBy:    filter.SortKey(),
		LimitVal:  filter.Limit,
		OffsetVal: filter.GetOffset(),
	}

	urls, dbErr := s.store.ListUserShortURLs(ctx, listParams)
	if dbErr != nil {
		err = apperr.MapDBError(dbErr, "failed to list short URLs", "")
		return nil, err
	}

	countParams := db.CountUserShortURLsParams{
		UserID:    userID,
		TenantID:  tenantID,
		Search:    searchVal,
		IsActive:  isActiveVal,
		StartDate: filter.StartDate,
		EndDate:   filter.EndDate,
	}

	total, countErr := s.store.CountUserShortURLs(ctx, countParams)
	if countErr != nil {
		err = apperr.MapDBError(countErr, "failed to count short URLs", "")
		return nil, err
	}

	items := make([]URLResponse, len(urls))
	for i, u := range urls {
		items[i] = s.toResponse(u)
	}

	return &ListURLResponse{
		Items: items,
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
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.Update", attribute.String("url.id", req.ID.String()))
	defer func() { endSpan(err) }()

	if err = req.Validate(); err != nil {
		return nil, err
	}

	if s.authorizer != nil {
		var domain string
		if tID, ok := web.TenantID(ctx); ok {
			domain = tID.String()
		}
		can, _ := s.authorizer.Can(ctx, req.UserID, domain, permission.UrlsUpdate)
		if !can {
			err = apperr.Forbidden("anda tidak memiliki izin untuk mengedit link singkat (urls.update)")
			return nil, err
		}
	}

	// Verify ownership first
	existing, getErr := s.GetByID(ctx, GetURLByIDRequest{ID: req.ID, UserID: req.UserID})
	if getErr != nil {
		err = getErr
		return nil, err
	}

	userUUID := &req.UserID

	u, updateErr := s.store.UpdateShortURL(ctx, db.UpdateShortURLParams{
		ID:          req.ID,
		Title:       req.Title,
		OriginalUrl: req.OriginalURL,
		IsActive:    req.IsActive,
		ExpiresAt:   req.ExpiresAt,
		UserID:      userUUID,
	})
	if updateErr != nil {
		err = apperr.MapDBError(updateErr, "failed to update short URL", "")
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", existing.ShortCode))
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) Delete(ctx context.Context, req DeleteURLRequest) (*DeleteURLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.Delete", attribute.String("url.id", req.ID.String()))
	defer func() { endSpan(err) }()

	if s.authorizer != nil {
		var domainDelete string
		if tID, ok := web.TenantID(ctx); ok {
			domainDelete = tID.String()
		}
		canDelete, _ := s.authorizer.Can(ctx, req.UserID, domainDelete, permission.UrlsDelete)
		if !canDelete {
			err = apperr.Forbidden("anda tidak memiliki izin untuk menghapus link singkat (urls.delete)")
			return nil, err
		}
	}

	// Verify ownership first
	existing, getErr := s.GetByID(ctx, GetURLByIDRequest(req))
	if getErr != nil {
		err = getErr
		return nil, err
	}

	userUUID := &req.UserID

	// Perform soft deletion within an atomic database transaction
	txErr := s.store.ExecTx(ctx, func(q *db.Queries) error {
		return q.DeleteShortURL(ctx, db.DeleteShortURLParams{
			ID:     req.ID,
			UserID: userUUID,
		})
	})
	if txErr != nil {
		err = apperr.MapDBError(txErr, "failed to delete short URL", "")
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", existing.ShortCode))
	}

	return &DeleteURLResponse{
		Message: "short URL soft-deleted successfully",
	}, nil
}

func (s *Service) Restore(ctx context.Context, req RestoreURLRequest) (*URLResponse, error) {
	var err error
	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.Restore", attribute.String("url.id", req.ID.String()))
	defer func() { endSpan(err) }()

	if s.authorizer != nil {
		var domain string
		if tID, ok := web.TenantID(ctx); ok {
			domain = tID.String()
		}
		can, _ := s.authorizer.Can(ctx, req.UserID, domain, permission.UrlsUpdate)
		if !can {
			err = apperr.Forbidden("anda tidak memiliki izin untuk memulihkan link singkat (urls.update)")
			return nil, err
		}
	}

	userUUID := &req.UserID

	var u db.ShortUrl
	txErr := s.store.ExecTx(ctx, func(q *db.Queries) error {
		var qErr error
		u, qErr = q.RestoreShortURL(ctx, db.RestoreShortURLParams{
			ID:     req.ID,
			UserID: userUUID,
		})
		return qErr
	})
	if txErr != nil {
		err = apperr.MapDBError(txErr, "deleted short URL not found or already restored", "")
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", u.ShortCode))
	}

	res := s.toResponse(u)
	return &res, nil
}

func (s *Service) IncrementClickCount(ctx context.Context, req IncrementClickCountRequest) error {
	err := s.store.IncrementClickCount(ctx, req.ID)
	if err != nil {
		return apperr.MapDBError(err, "failed to increment click count", "")
	}
	return nil
}

func (s *Service) DeactivateExpiredURLs(ctx context.Context) (int64, error) {
	codes, err := s.store.DeactivateExpiredURLs(ctx)
	if err != nil {
		return 0, apperr.MapDBError(err, "failed to cleanup expired URLs", "")
	}

	if s.cache != nil {
		for _, code := range codes {
			_ = s.cache.Delete(ctx, fmt.Sprintf("url:code:%s", code))
		}
	}

	return int64(len(codes)), nil
}

func (s *Service) StartExpirationCleanupWorker(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 1 * time.Minute
	}
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				if s.cache != nil {
					locked, err := s.cache.AcquireLock(ctx, "lock:cron:deactivate_expired_urls", 55*time.Second)
					if err != nil || !locked {
						continue
					}
				}
				if s.taskDistributor != nil {
					_ = s.taskDistributor.DistributeTaskDeactivateExpiredURLs(ctx, &worker.PayloadDeactivateExpiredURLs{
						BatchSize: 100,
					})
				} else {
					_, _ = s.DeactivateExpiredURLs(ctx)
				}
			}
		}
	}()
}
