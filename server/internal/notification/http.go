package notification

import (
	"net/http"
	"strconv"
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

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	r.Route("/notifications", func(r chi.Router) {
		r.Use(authMw)
		r.Get("/", h.listNotifications)
		r.Get("/unread-count", h.getUnreadCount)
		r.Patch("/{id}/read", h.markAsRead)
		r.Patch("/read-all", h.markAllAsRead)
		r.Delete("/read", h.clearRead)
		r.Delete("/{id}", h.deleteNotification)
	})
}

func (h *Handler) listNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	q := r.URL.Query()
	var pageVal int32 = 1
	if p, err := strconv.ParseInt(q.Get("page"), 10, 32); err == nil && p > 0 {
		pageVal = int32(p)
	}
	var limitVal int32 = 20
	if l, err := strconv.ParseInt(q.Get("limit"), 10, 32); err == nil && l > 0 && l <= 100 {
		limitVal = int32(l)
	}

	unreadOnly := q.Get("unread_only") == "true" || q.Get("filter") == "unread"
	nType := q.Get("type")
	search := q.Get("search")

	res, err := h.svc.ListNotifications(r.Context(), userID, pageVal, limitVal, unreadOnly, nType, search)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) getUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	res, err := h.svc.GetUnreadCount(r.Context(), userID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) markAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid notification id"))
		return
	}

	res, err := h.svc.MarkAsRead(r.Context(), userID, notifID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) markAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	if err := h.svc.MarkAllAsRead(r.Context(), userID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "all notifications marked as read"})
}

func (h *Handler) deleteNotification(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid notification id"))
		return
	}

	if err := h.svc.DeleteNotification(r.Context(), userID, notifID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "notification deleted"})
}

func (h *Handler) clearRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	if err := h.svc.ClearRead(r.Context(), userID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "read notifications cleared"})
}
