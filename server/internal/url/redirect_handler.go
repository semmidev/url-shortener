package url

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	_ "github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type AnalyticsRecorder interface {
	RecordClick(ctx context.Context, urlID uuid.UUID, ip, userAgent, referrer string)
}

type RedirectHandler struct {
	svc          *Service
	analyticsRec AnalyticsRecorder
}

func NewRedirectHandler(svc *Service, analyticsRec AnalyticsRecorder) *RedirectHandler {
	return &RedirectHandler{
		svc:          svc,
		analyticsRec: analyticsRec,
	}
}

// Redirect handles public short URL redirection
// @Summary Redirect short code to target destination URL
// @Tags Redirect
// @Param code path string true "Short Code"
// @Success 307 "Temporary Redirect to destination URL"
// @Failure 404 {object} apperr.Error
// @Router /{code} [get]
func (h *RedirectHandler) Redirect(w http.ResponseWriter, r *http.Request) {
	shortCode := chi.URLParam(r, "code")
	if shortCode == "" {
		web.Error(w, r, http.ErrMissingFile)
		return
	}

	logger.Enrich(r.Context(), "short_code", shortCode)

	res, err := h.svc.GetByCode(r.Context(), GetURLByCodeRequest{Code: shortCode})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	logger.Enrich(r.Context(), "target_url", res.OriginalURL)

	// Asynchronously record click metrics and increment counter
	// #nosec G118 -- background click logging outlives request context intentionally
	go func(urlID uuid.UUID, ip, userAgent, referrer string) {
		ctx := context.Background()
		_ = h.svc.IncrementClickCount(ctx, IncrementClickCountRequest{ID: urlID})
		if h.analyticsRec != nil {
			h.analyticsRec.RecordClick(ctx, urlID, ip, userAgent, referrer)
		}
	}(res.ID, r.RemoteAddr, r.UserAgent(), r.Referer())

	// Set Cache-Control header for Edge / CDN caching (Cloudflare, Fastly)
	maxAge := h.svc.cfg.CacheControlMaxAge
	if maxAge <= 0 {
		maxAge = 300
	}
	w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", maxAge, maxAge*12))

	// HTTP 307 Temporary Redirect to preserve request method if needed
	http.Redirect(w, r, res.OriginalURL, http.StatusTemporaryRedirect)
}
