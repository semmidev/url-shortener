package analytics

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RecordClick method implementation to satisfy url.AnalyticsRecorder interface
func (h *Handler) RecordClick(ctx context.Context, urlID uuid.UUID, ip, userAgent, referrer string) {
	_, _ = h.svc.RecordClick(ctx, RecordClickRequest{
		URLID:     urlID,
		IPAddress: ip,
		UserAgent: userAgent,
		Referrer:  referrer,
	})
}

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	r.Group(func(r chi.Router) {
		r.Use(authMw)
		r.Get("/urls/{id}/analytics", h.getAnalytics)
		r.Get("/analytics/dashboard", h.getDashboard)
	})
}

// getAnalytics handles fetching click analytics for a short URL
// @Summary Get analytics summary for a short URL
// @Tags Analytics
// @Security BearerAuth
// @Produce json
// @Param id path string true "Short URL UUID"
// @Success 200 {object} AnalyticsSummaryResponse
// @Failure 401 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id}/analytics [get]
func (h *Handler) getAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	urlID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	summary, err := h.svc.GetAnalyticsSummary(r.Context(), GetAnalyticsSummaryRequest{URLID: urlID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, summary)
}

// getDashboard handles fetching user-wide analytics dashboard metrics
// @Summary Get user dashboard aggregate analytics
// @Tags Analytics
// @Security BearerAuth
// @Produce json
// @Success 200 {object} UserDashboardResponse
// @Failure 401 {object} apperr.Error
// @Router /api/v1/analytics/dashboard [get]
func (h *Handler) getDashboard(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	dashboard, err := h.svc.GetUserDashboard(r.Context(), UserDashboardRequest{UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, dashboard)
}
