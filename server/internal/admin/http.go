package admin

import (
	"net/http"
	"uuid"

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

func (h *Handler) Mount(r chi.Router, authMw, roleAdminMw func(http.Handler) http.Handler) {
	r.Route("/admin", func(r chi.Router) {
		r.Use(authMw)
		r.Use(roleAdminMw)

		r.Get("/users", h.listUsers)
		r.Put("/users/{id}/suspend", h.suspendUser)
		r.Delete("/urls/{id}", h.forceDeleteURL)
		r.Get("/stats", h.getSystemStats)
	})
}

// listUsers returns paginated users for admin
// @Summary List all registered users
// @Tags Admin
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Param search query string false "Search query"
// @Success 200 {object} ListUsersResponse
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Router /api/v1/admin/users [get]
func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	filter := web.NewFilterFromRequest(r)
	res, err := h.svc.ListUsers(r.Context(), ListUsersRequest{Filter: filter})
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}

// suspendUser suspends or unsuspends a user account
// @Summary Suspend or unsuspend user account
// @Tags Admin
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "User UUID"
// @Param body body SuspendUserRequest true "Suspension payload"
// @Success 200 {object} AdminUserResponse
// @Failure 400 {object} apperr.Error
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Router /api/v1/admin/users/{id}/suspend [put]
func (h *Handler) suspendUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid user ID"))
		return
	}

	var req SuspendUserRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserID = userID

	res, err := h.svc.SetUserSuspended(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}

// forceDeleteURL deletes any short URL by admin
// @Summary Force delete any short URL
// @Tags Admin
// @Security BearerAuth
// @Produce json
// @Param id path string true "Short URL UUID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Failure 404 {object} apperr.Error
// @Router /api/v1/admin/urls/{id} [delete]
func (h *Handler) forceDeleteURL(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	urlID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid short URL ID"))
		return
	}

	if err := h.svc.ForceDeleteURL(r.Context(), urlID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "short URL force deleted by admin"})
}

// getSystemStats returns global platform statistics
// @Summary Get system-wide platform statistics
// @Tags Admin
// @Security BearerAuth
// @Produce json
// @Success 200 {object} SystemStatsResponse
// @Failure 401 {object} apperr.Error
// @Failure 403 {object} apperr.Error
// @Router /api/v1/admin/stats [get]
func (h *Handler) getSystemStats(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.GetSystemStats(r.Context())
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}
