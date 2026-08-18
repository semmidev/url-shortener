package analytics

import (
	"context"
	"strings"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
)

type Service struct {
	store db.Store
}

func NewService(store db.Store) *Service {
	return &Service{store: store}
}

func parseDeviceType(ua string) string {
	lowerUA := strings.ToLower(ua)
	switch {
	case strings.Contains(lowerUA, "mobile"), strings.Contains(lowerUA, "iphone"), strings.Contains(lowerUA, "android"):
		return "mobile"
	case strings.Contains(lowerUA, "ipad"), strings.Contains(lowerUA, "tablet"):
		return "tablet"
	case strings.Contains(lowerUA, "bot"), strings.Contains(lowerUA, "crawler"), strings.Contains(lowerUA, "spider"):
		return "bot"
	case lowerUA != "":
		return "desktop"
	default:
		return "unknown"
	}
}

func (s *Service) RecordClick(ctx context.Context, req RecordClickRequest) (*RecordClickResponse, error) {
	deviceType := parseDeviceType(req.UserAgent)
	_, err := s.store.RecordClick(ctx, db.RecordClickParams{
		UrlID:      req.URLID,
		IpAddress:  req.IPAddress,
		UserAgent:  req.UserAgent,
		Referrer:   req.Referrer,
		DeviceType: deviceType,
		Country:    "unknown",
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to record click analytics", "")
	}
	return &RecordClickResponse{Success: true}, nil
}

func (s *Service) GetAnalyticsSummary(ctx context.Context, req GetAnalyticsSummaryRequest) (*AnalyticsSummaryResponse, error) {
	summary, err := s.store.GetURLAnalyticsSummary(ctx, req.URLID)
	if err != nil {
		return nil, apperr.MapDBError(err, "analytics summary not found for this URL", "")
	}

	clicks, err := s.store.ListRecentClicksByUrlID(ctx, db.ListRecentClicksByUrlIDParams{
		UrlID:  req.URLID,
		Limit:  50,
		Offset: 0,
	})
	if err != nil {
		return nil, apperr.MapDBError(err, "failed to fetch recent click logs", "")
	}

	recentClicks := make([]ClickResponse, len(clicks))
	for i, c := range clicks {
		recentClicks[i] = ClickResponse{
			ID:         c.ID,
			IPAddress:  c.IpAddress,
			UserAgent:  c.UserAgent,
			Referrer:   c.Referrer,
			DeviceType: c.DeviceType,
			Country:    c.Country,
			ClickedAt:  c.ClickedAt,
		}
	}

	return &AnalyticsSummaryResponse{
		URLID:          req.URLID,
		TotalClicks:    summary.TotalClicks,
		UniqueVisitors: summary.UniqueVisitors,
		RecentClicks:   recentClicks,
	}, nil
}
