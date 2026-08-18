package web

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Filter represents comprehensive query parameters for paginated list endpoints (DataTables support).
type Filter struct {
	Page          int32      `json:"page"`           // Current page number (1-indexed)
	Limit         int32      `json:"limit"`          // Items per page
	Search        string     `json:"search"`         // Search keyword
	SortBy        string     `json:"sort_by"`        // Column to sort by (created_at, click_count, title, short_code)
	SortDirection string     `json:"sort_direction"` // Sort direction: asc or desc
	Active        int        `json:"active"`         // Active filter: 1 -> active only, 0 -> inactive only, -1 -> all
	StartDate     *time.Time `json:"start_date,omitempty"`
	EndDate       *time.Time `json:"end_date,omitempty"`
}

func NewFilterFromRequest(r *http.Request) Filter {
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page, _ = strconv.Atoi(q.Get("current_page"))
	}
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 {
		limit, _ = strconv.Atoi(q.Get("per_page"))
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	search := strings.TrimSpace(q.Get("search"))
	if search == "" {
		search = strings.TrimSpace(q.Get("keyword"))
	}

	sortBy := strings.TrimSpace(q.Get("sort_by"))
	if sortBy == "" {
		sortBy = "created_at"
	}

	sortDir := strings.ToLower(strings.TrimSpace(q.Get("sort_direction")))
	if sortDir == "" {
		sortDir = strings.ToLower(strings.TrimSpace(q.Get("sort_order")))
	}
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "desc"
	}

	active := -1
	if activeStr := q.Get("active"); activeStr != "" {
		if a, err := strconv.Atoi(activeStr); err == nil {
			active = a
		} else if b, err := strconv.ParseBool(activeStr); err == nil {
			if b {
				active = 1
			} else {
				active = 0
			}
		}
	}

	var startDate, endDate *time.Time
	if startStr := q.Get("start_date"); startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			startDate = &t
		} else if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = &t
		}
	}
	if endStr := q.Get("end_date"); endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			endDate = &t
		} else if t, err := time.Parse("2006-01-02", endStr); err == nil {
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			endDate = &t
		}
	}

	return Filter{
		Page:          int32(page),
		Limit:         int32(limit),
		Search:        search,
		SortBy:        sortBy,
		SortDirection: sortDir,
		Active:        active,
		StartDate:     startDate,
		EndDate:       endDate,
	}
}

func (f Filter) GetOffset() int32 {
	return (f.Page - 1) * f.Limit
}

func (f Filter) SortKey() string {
	sortBy := strings.ToLower(f.SortBy)
	switch sortBy {
	case "click_count", "clicks":
		return "click_count_" + f.SortDirection
	case "title":
		return "title_" + f.SortDirection
	case "short_code", "code":
		return "short_code_" + f.SortDirection
	default:
		return "created_at_" + f.SortDirection
	}
}
