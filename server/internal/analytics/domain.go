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

type ClickEvent struct {
	URLID      uuid.UUID `json:"url_id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	Referrer   string    `json:"referrer"`
	DeviceType string    `json:"device_type"`
	Country    string    `json:"country"`
}

type AnalyticsSummaryResponse struct {
	URLID          uuid.UUID       `json:"url_id"`
	TotalClicks    int64           `json:"total_clicks"`
	UniqueVisitors int64           `json:"unique_visitors"`
	RecentClicks   []ClickResponse `json:"recent_clicks"`
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
