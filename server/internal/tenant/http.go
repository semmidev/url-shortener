package tenant

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
	r.Route("/tenants", func(r chi.Router) {
		r.Use(authMw)

		r.Get("/", h.listUserTenants)
		r.Post("/", h.createTenant)
		r.Post("/join", h.joinTenant)

		r.Route("/{id}", func(r chi.Router) {
			r.Put("/", h.updateTenant)
			r.Delete("/", h.deleteTenant)
			r.Post("/join-code/regenerate", h.regenerateJoinCode)

			r.Get("/members", h.listTenantMembers)
			r.Post("/members", h.addTenantMember)
			r.Put("/members/{userId}", h.updateTenantMemberRole)
			r.Delete("/members/{userId}", h.removeTenantMember)

			r.Get("/roles", h.listTenantRoles)
			r.Post("/roles", h.createTenantRole)
			r.Put("/roles/{roleId}/permissions", h.updateTenantRolePermissions)
			r.Delete("/roles/{roleId}", h.deleteTenantRole)
		})
	})
}

func (h *Handler) listUserTenants(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	tenants, err := h.svc.ListUserTenants(r.Context(), userID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, tenants)
}

func (h *Handler) createTenant(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	var req CreateTenantRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	tenant, err := h.svc.CreateTenant(r.Context(), userID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusCreated, tenant)
}

func (h *Handler) joinTenant(w http.ResponseWriter, r *http.Request) {
	userID, ok := web.UserID(r.Context())
	if !ok {
		web.Error(w, r, apperr.Unauthorized("authentication required"))
		return
	}

	var req JoinTenantRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	tenant, err := h.svc.JoinTenant(r.Context(), userID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, tenant)
}

func (h *Handler) listTenantMembers(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	members, err := h.svc.ListTenantMembers(r.Context(), tenantID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, members)
}

func (h *Handler) addTenantMember(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	var req AddTenantMemberRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	actorID, _ := web.UserID(r.Context())
	member, err := h.svc.AddTenantMember(r.Context(), tenantID, req, actorID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusCreated, member)
}

func (h *Handler) updateTenantMemberRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid user ID"))
		return
	}

	var req UpdateTenantMemberRoleRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	member, err := h.svc.UpdateTenantMemberRole(r.Context(), tenantID, targetUserID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, member)
}

func (h *Handler) removeTenantMember(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid user ID"))
		return
	}

	if err := h.svc.RemoveTenantMember(r.Context(), tenantID, targetUserID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "tenant member removed successfully"})
}

func (h *Handler) listTenantRoles(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	roles, err := h.svc.ListTenantRoles(r.Context(), tenantID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, roles)
}

func (h *Handler) createTenantRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	var req CreateTenantRoleRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	role, err := h.svc.CreateTenantRole(r.Context(), tenantID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusCreated, role)
}

func (h *Handler) updateTenantRolePermissions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	roleIDStr := chi.URLParam(r, "roleId")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid role ID"))
		return
	}

	var req UpdateTenantRolePermissionsRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	role, err := h.svc.UpdateTenantRolePermissions(r.Context(), tenantID, roleID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, role)
}

func (h *Handler) deleteTenantRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	roleIDStr := chi.URLParam(r, "roleId")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid role ID"))
		return
	}

	if err := h.svc.DeleteTenantRole(r.Context(), tenantID, roleID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "tenant custom role deleted successfully"})
}

func (h *Handler) updateTenant(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	var req UpdateTenantRequest
	if err := web.Decode(r, &req); err != nil {
		web.Error(w, r, err)
		return
	}

	tenant, err := h.svc.UpdateTenant(r.Context(), tenantID, req)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, tenant)
}

func (h *Handler) regenerateJoinCode(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	tenant, err := h.svc.RegenerateJoinCode(r.Context(), tenantID)
	if err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, tenant)
}

func (h *Handler) deleteTenant(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	tenantID, err := uuid.Parse(idStr)
	if err != nil {
		web.Error(w, r, apperr.Invalid("invalid tenant ID"))
		return
	}

	if err := h.svc.DeleteTenant(r.Context(), tenantID); err != nil {
		web.Error(w, r, err)
		return
	}

	web.JSON(w, http.StatusOK, map[string]string{"message": "workspace deleted successfully"})
}
