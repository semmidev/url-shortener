package admin

import (
	"net/http"
	"uuid"

	"github.com/go-chi/chi/v5"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/audit"
	"github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Handler struct {
	svc         *Service
	queries     db.Querier
	auditLogger *audit.Logger
}

func NewHandler(svc *Service, queries db.Querier, auditLogger *audit.Logger) *Handler {
	return &Handler{
		svc:         svc,
		queries:     queries,
		auditLogger: auditLogger,
	}
}

func (h *Handler) Mount(r chi.Router, authMw func(http.Handler) http.Handler) {
	requirePerm := func(code string) func(http.Handler) http.Handler {
		return middleware.RequirePermission(h.queries, code)
	}

	r.Route("/admin", func(r chi.Router) {
		r.Use(authMw)

		// System stats overview
		r.With(requirePerm("admin.dashboard.read")).Get("/stats/overview", h.getSystemStats)
		r.With(requirePerm("admin.dashboard.read")).Get("/stats", h.getSystemStats) // alias

		// User Management
		r.With(requirePerm("users.read")).Get("/users", h.listUsers)
		r.With(requirePerm("users.suspend")).Patch("/users/{id}/status", h.suspendUser)
		r.With(requirePerm("users.suspend")).Put("/users/{id}/suspend", h.suspendUser) // alias
		r.With(requirePerm("users.roles.update")).Patch("/users/{id}/role", h.updateUserRole)
		r.With(requirePerm("users.sessions.revoke")).Delete("/users/{id}/sessions", h.revokeUserSessions)

		// RBAC Roles & Permissions
		r.With(requirePerm("roles.read")).Get("/roles", h.listRoles)
		r.With(requirePerm("roles.create")).Post("/roles", h.createRole)
		r.With(requirePerm("roles.permissions.update")).Put("/roles/{id}/permissions", h.updateRolePermissions)
		r.With(requirePerm("roles.read")).Get("/permissions", h.listPermissions)

		// Global Link Control & Oversight
		r.With(requirePerm("links.read")).Get("/links", h.listGlobalLinks)
		r.With(requirePerm("links.ban")).Patch("/links/{id}/ban", h.banGlobalLink)
		r.With(requirePerm("links.ban")).Delete("/urls/{id}", h.forceDeleteURL)

		// Audit Logs
		r.With(requirePerm("audit.read")).Get("/audit-logs", h.listAuditLogs)

		// System Configuration & Feature Flags
		r.With(requirePerm("system.config.read")).Get("/system/config", h.listSystemConfigs)
		r.With(requirePerm("system.config.update")).Put("/system/config/{key}", h.updateSystemConfig)
	})
}

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	filter := web.NewFilterFromRequest(r)
	res, err := h.svc.ListUsers(r.Context(), ListUsersRequest{Filter: filter})
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

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

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "USER_SUSPEND_TOGGLE",
		Resource:   "user",
		ResourceID: userID.String(),
		Payload:    res,
	})

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) updateUserRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid user ID"))
		return
	}

	var req UpdateUserRoleRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}
	req.UserID = userID

	res, err := h.svc.UpdateUserRole(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "USER_ROLE_UPDATED",
		Resource:   "user",
		ResourceID: userID.String(),
		Payload:    res,
	})

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) revokeUserSessions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid user ID"))
		return
	}

	if err := h.svc.RevokeUserSessions(r.Context(), userID); err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "USER_SESSIONS_REVOKED",
		Resource:   "user",
		ResourceID: userID.String(),
	})

	web.JSON(w, http.StatusOK, map[string]string{"message": "all user sessions revoked successfully"})
}

func (h *Handler) getSystemStats(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.GetSystemStats(r.Context())
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) listRoles(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.ListRoles(r.Context())
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) createRole(w http.ResponseWriter, r *http.Request) {
	var req CreateRoleRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	res, err := h.svc.CreateRole(r.Context(), req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "ROLE_CREATED",
		Resource:   "role",
		ResourceID: res.ID.String(),
		Payload:    res,
	})

	web.JSON(w, http.StatusCreated, res)
}

func (h *Handler) updateRolePermissions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	roleID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid role ID"))
		return
	}

	var req UpdateRolePermissionsRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	res, err := h.svc.UpdateRolePermissions(r.Context(), roleID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "ROLE_PERMISSIONS_UPDATED",
		Resource:   "role",
		ResourceID: roleID.String(),
		Payload:    res,
	})

	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) listPermissions(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.ListPermissions(r.Context())
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) listGlobalLinks(w http.ResponseWriter, r *http.Request) {
	filter := web.NewFilterFromRequest(r)
	res, err := h.svc.ListGlobalLinks(r.Context(), filter)
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) banGlobalLink(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	urlID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid URL ID"))
		return
	}

	var req BanURLRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	if err := h.svc.SetURLActiveStatus(r.Context(), urlID, req.IsActive); err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "LINK_BAN_TOGGLE",
		Resource:   "short_url",
		ResourceID: urlID.String(),
		Payload:    req,
	})

	web.JSON(w, http.StatusOK, map[string]string{"message": "URL active status updated successfully"})
}

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

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "LINK_FORCE_DELETED",
		Resource:   "short_url",
		ResourceID: urlID.String(),
	})

	web.JSON(w, http.StatusOK, map[string]string{"message": "short URL force deleted by admin"})
}

func (h *Handler) listAuditLogs(w http.ResponseWriter, r *http.Request) {
	filter := web.NewFilterFromRequest(r)
	res, err := h.svc.ListAuditLogs(r.Context(), filter)
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) listSystemConfigs(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.ListSystemConfigs(r.Context())
	if err != nil {
		web.Error(w, r, err)
		return
	}
	web.JSON(w, http.StatusOK, res)
}

func (h *Handler) updateSystemConfig(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if key == "" {
		web.Error(w, r, apperr.Invalid("config key is required"))
		return
	}

	var req UpdateSystemConfigRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	res, err := h.svc.UpdateSystemConfig(r.Context(), key, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	h.auditLogger.Log(r.Context(), r, audit.AuditParams{
		Action:     "SYSTEM_CONFIG_UPDATED",
		Resource:   "system_config",
		ResourceID: key,
		Payload:    res,
	})

	web.JSON(w, http.StatusOK, res)
}
