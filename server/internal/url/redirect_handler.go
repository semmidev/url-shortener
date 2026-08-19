package url

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/skip2/go-qrcode"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type AnalyticsRecorder interface {
	RecordClick(ctx context.Context, urlID uuid.UUID, ip, userAgent, referrer string)
}

type RedirectHandler struct {
	svc          *Service
	analyticsRec AnalyticsRecorder
	spaHandler   http.Handler
}

func NewRedirectHandler(svc *Service, analyticsRec AnalyticsRecorder, spaHandler http.Handler) *RedirectHandler {
	return &RedirectHandler{
		svc:          svc,
		analyticsRec: analyticsRec,
		spaHandler:   spaHandler,
	}
}

type URLPreviewResponse struct {
	ShortCode    string `json:"short_code"`
	ShortURL     string `json:"short_url"`
	OriginalURL  string `json:"original_url"`
	Title        string `json:"title"`
	IsActive     bool   `json:"is_active"`
	SafetyRating string `json:"safety_rating"` // SAFE, SUSPICIOUS
	IsHTTPS      bool   `json:"is_https"`
	Domain       string `json:"domain"`
}

// Redirect handles public short URL redirection or preview/qr routing if suffix '+' or '/qr' is used
// @Summary Redirect short code to target destination URL
// @Tags Redirect
// @Param code path string true "Short Code"
// @Success 307 "Temporary Redirect to destination URL"
// @Failure 404 {object} apperr.Error
// @Router /{code} [get]
func (h *RedirectHandler) Redirect(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// 1. If path is a physical static asset file embedded in SPA (e.g. /assets/*, /vite.svg), serve it directly.
	if h.spaHandler != nil {
		type fileChecker interface {
			HasFile(string) bool
		}
		if fc, ok := h.spaHandler.(fileChecker); ok && fc.HasFile(path) {
			h.spaHandler.ServeHTTP(w, r)
			return
		}
	}

	shortCode := chi.URLParam(r, "code")
	if isFrontendRoute(shortCode) {
		if h.spaHandler != nil {
			h.spaHandler.ServeHTTP(w, r)
			return
		}
	}

	if shortCode == "" || path == "/" {
		if h.spaHandler != nil {
			h.spaHandler.ServeHTTP(w, r)
			return
		}
		web.Error(w, r, apperr.Invalid("short code is required"))
		return
	}

	// Support /{code}+ for instant preview
	if strings.HasSuffix(shortCode, "+") {
		shortCode = strings.TrimSuffix(shortCode, "+")
		h.PreviewWithCode(w, r, shortCode)
		return
	}

	logger.Enrich(r.Context(), "short_code", shortCode)

	res, err := h.svc.GetByCode(r.Context(), GetURLByCodeRequest{Code: shortCode})
	if err != nil {
		// If browser HTML page navigation (Accept: text/html), redirect to the frontend invalid page.
		if h.spaHandler != nil && strings.Contains(r.Header.Get("Accept"), "text/html") {
			reason := "not_found"
			errMsg := err.Error()
			if strings.Contains(errMsg, "inactive") {
				reason = "inactive"
			} else if strings.Contains(errMsg, "expired") {
				reason = "expired"
			}
			redirectURL := fmt.Sprintf("/invalid-url?code=%s&reason=%s", url.QueryEscape(shortCode), reason)
			http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
			return
		}
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

// Preview handles short code preview and safety inspection
// @Summary Preview short URL destination and safety analysis
// @Tags Redirect
// @Param code path string true "Short Code"
// @Success 200 {object} URLPreviewResponse
// @Failure 404 {object} apperr.Error
// @Router /{code}/preview [get]
func (h *RedirectHandler) Preview(w http.ResponseWriter, r *http.Request) {
	shortCode := chi.URLParam(r, "code")
	shortCode = strings.TrimSuffix(shortCode, "+")
	h.PreviewWithCode(w, r, shortCode)
}

func (h *RedirectHandler) PreviewWithCode(w http.ResponseWriter, r *http.Request, code string) {
	res, err := h.svc.GetByCode(r.Context(), GetURLByCodeRequest{Code: code})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	parsedURL, err := url.Parse(res.OriginalURL)
	domain := ""
	isHTTPS := false
	safetyRating := "SAFE"

	if err == nil {
		domain = parsedURL.Hostname()
		isHTTPS = parsedURL.Scheme == "https"
		if !isHTTPS || net.ParseIP(domain) != nil {
			safetyRating = "SUSPICIOUS"
		}
	}

	preview := URLPreviewResponse{
		ShortCode:    res.ShortCode,
		ShortURL:     res.ShortURL,
		OriginalURL:  res.OriginalURL,
		Title:        res.Title,
		IsActive:     res.IsActive,
		SafetyRating: safetyRating,
		IsHTTPS:      isHTTPS,
		Domain:       domain,
	}

	web.JSON(w, http.StatusOK, preview)
}

// QRCode renders a PNG QR code for the short URL
// @Summary Get QR Code image (PNG) for short code
// @Tags Redirect
// @Param code path string true "Short Code"
// @Success 200 "PNG Image"
// @Failure 404 {object} apperr.Error
// @Router /{code}/qr [get]
func (h *RedirectHandler) QRCode(w http.ResponseWriter, r *http.Request) {
	shortCode := chi.URLParam(r, "code")
	res, err := h.svc.GetByCode(r.Context(), GetURLByCodeRequest{Code: shortCode})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	pngBytes, err := qrcode.Encode(res.ShortURL, qrcode.Medium, 256)
	if err != nil {
		web.Error(w, r, apperr.Internal("failed to generate QR code", err))
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pngBytes)
}

func isFrontendRoute(code string) bool {
	switch code {
	case "login", "register", "dashboard", "auth", "invalid-url":
		return true
	}
	return false
}
