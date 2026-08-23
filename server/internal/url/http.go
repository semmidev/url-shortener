package url

import (
	"net/http"
	"uuid"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/skip2/go-qrcode"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	// All short URL endpoints require authentication
	r.Group(func(r chi.Router) {
		r.Use(authMw)
		r.Post("/urls", h.create)
		r.Get("/urls", h.list)
		r.Get("/urls/{id}", h.getByID)
		r.Get("/urls/{id}/qr", h.getQRByID)
		r.Post("/urls/{id}/restore", h.restore)
		r.Put("/urls/{id}", h.update)
		r.Delete("/urls/{id}", h.delete)
	})
}

// create handles short URL creation
// @Summary Create a short URL
// @Tags URLs
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body CreateURLRequest true "Create short URL request"
// @Success 201 {object} URLResponse
// @Failure 400 {object} apperr.Error
// @Failure 401 {object} apperr.Error
// @Failure 409 {object} apperr.Error
// @Router /api/v1/urls [post]
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	var req CreateURLRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	req.UserID = &userID

	resp, err := h.svc.Create(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusCreated, resp)
}

// list handles user short URLs retrieval with DataTable support
// @Summary List user short URLs with DataTable controls
// @Tags URLs
// @Security BearerAuth
// @Produce json
// @Param search query string false "Search keyword for title, code, or URL"
// @Param sort_by query string false "Column to sort by (created_at, click_count, title, short_code)"
// @Param sort_direction query string false "Sort direction (asc, desc)"
// @Param active query integer false "Filter status: 1 (active), 0 (inactive), -1 (all)"
// @Param page query integer false "Page number (default 1)"
// @Param limit query integer false "Items per page (default 20)"
// @Success 200 {object} ListURLResponse
// @Failure 401 {object} apperr.Error
// @Router /api/v1/urls [get]
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	filter := web.NewFilterFromRequest(r)

	resp, err := h.svc.List(r.Context(), ListUserShortURLsRequest{
		UserID: userID,
		Filter: filter,
	})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.Success(w, http.StatusOK, "User short URLs fetched successfully", resp.Items, resp.Meta)
}

// getByID handles short URL detail retrieval
// @Summary Get short URL by ID
// @Tags URLs
// @Security BearerAuth
// @Produce json
// @Param id path string true "Short URL UUID"
// @Success 200 {object} URLResponse
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id} [get]
func (h *Handler) getByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	resp, err := h.svc.GetByID(r.Context(), GetURLByIDRequest{ID: id, UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

// update handles updating a short URL
// @Summary Update short URL details
// @Tags URLs
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Short URL UUID"
// @Param request body UpdateURLRequest true "Update payload"
// @Success 200 {object} URLResponse
// @Failure 400 {object} apperr.Error
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id} [put]
func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	var req UpdateURLRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.ID = id
	req.UserID = userID

	resp, err := h.svc.Update(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

// delete handles short URL deletion
// @Summary Delete short URL
// @Tags URLs
// @Security BearerAuth
// @Produce json
// @Param id path string true "Short URL UUID"
// @Success 200 {object} DeleteURLResponse
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id} [delete]
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	resp, err := h.svc.Delete(r.Context(), DeleteURLRequest{ID: id, UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}

// getQRByID handles generating PNG QR code for a short URL by ID
// @Summary Get QR Code image (PNG) for a short URL by ID
// @Tags URLs
// @Security BearerAuth
// @Produce image/png
// @Param id path string true "Short URL UUID"
// @Success 200 "PNG Image"
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id}/qr [get]
func (h *Handler) getQRByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	res, err := h.svc.GetByID(r.Context(), GetURLByIDRequest{ID: id, UserID: userID})
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

// restore handles restoring a soft-deleted short URL
// @Summary Restore a soft-deleted short URL
// @Tags URLs
// @Security BearerAuth
// @Produce json
// @Param id path string true "Short URL UUID"
// @Success 200 {object} URLResponse
// @Failure 401 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/urls/{id}/restore [post]
func (h *Handler) restore(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	res, err := h.svc.Restore(r.Context(), RestoreURLRequest{ID: id, UserID: userID})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}
