package storage

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	r.Group(func(r chi.Router) {
		r.Use(authMw)
		r.Post("/presigned-url", h.getPresignedURL)
	})
}

// getPresignedURL generates an S3 presigned PUT URL for browser uploads
// @Summary Generate S3 presigned upload URL
// @Tags Storage
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body PresignedURLRequest true "Upload metadata"
// @Success 200 {object} PresignedURLResponse
// @Failure 400 {object} apperr.Error
// @Failure 401 {object} apperr.Error
// @Router /api/v1/storage/presigned-url [post]
func (h *Handler) getPresignedURL(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("unauthenticated"))
		return
	}

	var req PresignedURLRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	resp, err := h.svc.GeneratePresignedUploadURL(r.Context(), userID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, resp)
}
