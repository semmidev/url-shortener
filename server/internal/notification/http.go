package notification

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

	filter := web.NewFilterFromRequest(r)
	q := r.URL.Query()
	unreadOnly := q.Get("unread_only") == "true" || q.Get("filter") == "unread"
	nType := q.Get("type")

	res, err := h.svc.ListNotifications(r.Context(), ListNotificationsRequest{
		UserID:     userID,
		Filter:     filter,
		UnreadOnly: unreadOnly,
		Type:       nType,
	})
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

	res, err := h.svc.GetUnreadCount(r.Context(), GetUnreadCountRequest{
		UserID: userID,
	})
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

	res, err := h.svc.MarkAsRead(r.Context(), MarkAsReadRequest{
		UserID:         userID,
		NotificationID: notifID,
	})
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

	if err := h.svc.MarkAllAsRead(r.Context(), MarkAllAsReadRequest{UserID: userID}); err != nil {
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

	if err := h.svc.DeleteNotification(r.Context(), DeleteNotificationRequest{UserID: userID, NotificationID: notifID}); err != nil {
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

	if err := h.svc.ClearRead(r.Context(), ClearReadRequest{UserID: userID}); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "read notifications cleared"})
}
