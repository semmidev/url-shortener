package analytics

import (
	"time"

	"github.com/google/uuid"
)

type RecordClickRequest struct {
	URLID     uuid.UUID `json:"url_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Referrer  string    `json:"referrer"`
}

type RecordClickResponse struct {
	Success bool `json:"success"`
}

type GetAnalyticsSummaryRequest struct {
	URLID uuid.UUID `json:"url_id"`
}

type ClickOverTimeStat struct {
	Date       string `json:"date"`
	ClickCount int64  `json:"click_count"`
}

type AnalyticsSummaryResponse struct {
	URLID          uuid.UUID           `json:"url_id"`
	TotalClicks    int64               `json:"total_clicks"`
	UniqueVisitors int64               `json:"unique_visitors"`
	RecentClicks   []ClickResponse     `json:"recent_clicks"`
	ClicksOverTime []ClickOverTimeStat `json:"clicks_over_time"`
}

type ClickResponse struct {
	ID         uuid.UUID `json:"id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	Referrer   string    `json:"referrer"`
	DeviceType string    `json:"device_type"`
	Country    string    `json:"country"`
	ClickedAt  time.Time `json:"clicked_at"`
}

type UserDashboardRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

type ReferrerStat struct {
	Referrer   string `json:"referrer"`
	ClickCount int64  `json:"click_count"`
}

type DeviceStat struct {
	DeviceType string `json:"device_type"`
	ClickCount int64  `json:"click_count"`
}

type CountryStat struct {
	Country    string `json:"country"`
	ClickCount int64  `json:"click_count"`
}

type UserDashboardResponse struct {
	TotalURLs      int64               `json:"total_urls"`
	TotalClicks    int64               `json:"total_clicks"`
	TopReferrers   []ReferrerStat      `json:"top_referrers"`
	Devices        []DeviceStat        `json:"devices"`
	Countries      []CountryStat       `json:"countries"`
	ClicksOverTime []ClickOverTimeStat `json:"clicks_over_time"`
}
