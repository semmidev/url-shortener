package tenant

import (
	"context"
	"crypto/rand"
	"fmt"
	"strings"
	"time"

	"uuid"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/notification"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/telemetry"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"go.opentelemetry.io/otel/attribute"
)

type Service struct {
	q          db.Querier
	authorizer authz.Authorizer
	notifSvc   *notification.Service
}

func NewService(q db.Querier, authorizer authz.Authorizer, notifSvc *notification.Service) *Service {
	return &Service{
		q:          q,
		authorizer: authorizer,
		notifSvc:   notifSvc,
	}
}

func GenerateJoinCode() string {
	b := make([]byte, JoinCodeLength)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = JoinCodeAlphabet[int(b[i])%len(JoinCodeAlphabet)]
	}
	return string(b)
}

func (s *Service) ListUserTenants(ctx context.Context, userID uuid.UUID) (res []TenantResponse, err error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "tenant.Service.ListUserTenants", attribute.String("user.id", userID.String()))
	defer func() { endSpan(err) }()

	tenants, err := s.q.ListUserTenants(ctx, userID)
	if err != nil {
		return nil, apperr.Internal("failed to list user tenants", err)
	}

	r := make([]TenantResponse, len(tenants))
	for i, t := range tenants {
		r[i] = TenantResponse{
			ID:        t.ID,
			Name:      t.Name,
			Slug:      t.Slug,
			JoinCode:  t.JoinCode,
			Role:      t.Role,
			CreatedAt: t.CreatedAt,
			UpdatedAt: t.UpdatedAt,
		}
	}
	return r, nil
}

func (s *Service) CreateTenant(ctx context.Context, userID uuid.UUID, req CreateTenantRequest) (res TenantResponse, err error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "tenant.Service.CreateTenant", attribute.String("user.id", userID.String()), attribute.String("tenant.name", req.Name))
	defer func() { endSpan(err) }()
	if err := req.Validate(); err != nil {
		return TenantResponse{}, err
	}

	if s.authorizer != nil {
		can, _ := s.authorizer.Can(ctx, userID, authz.DefaultDomain, permission.TenantsCreate)
		if !can {
			return TenantResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk membuat workspace (tenants.create)")
		}
	}

	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	if slug == "" {
		slug = fmt.Sprintf("tenant-%d", time.Now().UnixNano())
	}

	joinCode := GenerateJoinCode()

	t, err := s.q.CreateTenant(ctx, db.CreateTenantParams{
		Name:     req.Name,
		Slug:     slug,
		JoinCode: joinCode,
	})
	if err != nil {
		return TenantResponse{}, apperr.Internal("failed to create tenant: "+err.Error(), err)
	}

	// Add creator as tenant owner
	m, err := s.q.AddTenantMember(ctx, db.AddTenantMemberParams{
		TenantID: t.ID,
		UserID:   userID,
		Role:     "owner",
	})
	if err != nil {
		return TenantResponse{}, apperr.Internal("failed to assign tenant ownership", err)
	}

	// Assign owner role grouping in Casbin for this tenant domain
	_ = s.authorizer.AddUserRole(ctx, userID, "owner", t.ID.String())

	return TenantResponse{
		ID:        t.ID,
		Name:      t.Name,
		Slug:      t.Slug,
		JoinCode:  t.JoinCode,
		Role:      m.Role,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}, nil
}

func (s *Service) JoinTenant(ctx context.Context, userID uuid.UUID, req JoinTenantRequest) (TenantResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantResponse{}, err
	}

	joinCode := strings.ToUpper(strings.TrimSpace(req.JoinCode))
	t, err := s.q.GetTenantByJoinCode(ctx, joinCode)
	if err != nil {
		return TenantResponse{}, apperr.NotFound(fmt.Sprintf("invalid join code '%s'", req.JoinCode))
	}

	m, err := s.q.AddTenantMember(ctx, db.AddTenantMemberParams{
		TenantID: t.ID,
		UserID:   userID,
		Role:     "member",
	})
	if err != nil {
		return TenantResponse{}, apperr.Internal("failed to join tenant", err)
	}

	_ = s.authorizer.AddUserRole(ctx, userID, "member", t.ID.String())

	if s.notifSvc != nil {
		user, uErr := s.q.GetUserByID(ctx, userID)
		members, mErr := s.q.ListTenantMembers(ctx, t.ID)
		if uErr == nil && mErr == nil {
			userName := user.FullName
			if userName == "" {
				userName = user.Email
			}
			for _, mem := range members {
				if mem.Role == "owner" && mem.UserID != userID {
					_, _ = s.notifSvc.CreateNotification(ctx, notification.CreateNotificationRequest{
						UserID:  mem.UserID,
						Title:   "Anggota Baru Bergabung",
						Message: fmt.Sprintf("%s (%s) telah bergabung ke workspace '%s' menggunakan kode gabung.", userName, user.Email, t.Name),
						Type:    "workspace",
					})
				}
			}
		}
	}

	return TenantResponse{
		ID:        t.ID,
		Name:      t.Name,
		Slug:      t.Slug,
		JoinCode:  t.JoinCode,
		Role:      m.Role,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}, nil
}

func (s *Service) ListTenantMembers(ctx context.Context, tenantID uuid.UUID) ([]TenantMemberResponse, error) {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.TenantsRead)
			if !can {
				return nil, apperr.Forbidden("anda tidak memiliki izin untuk melihat anggota workspace (tenants.read)")
			}
		}
	}

	members, err := s.q.ListTenantMembers(ctx, tenantID)
	if err != nil {
		return nil, apperr.Internal("failed to list tenant members", err)
	}

	res := make([]TenantMemberResponse, len(members))
	for i, m := range members {
		res[i] = TenantMemberResponse{
			UserID:    m.UserID,
			Email:     m.Email,
			FullName:  m.FullName,
			AvatarURL: m.AvatarUrl,
			Role:      m.Role,
			CreatedAt: m.CreatedAt,
		}
	}
	return res, nil
}

func (s *Service) AddTenantMember(ctx context.Context, tenantID uuid.UUID, req AddTenantMemberRequest, actorID uuid.UUID) (TenantMemberResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantMemberResponse{}, err
	}

	if s.authorizer != nil {
		can, _ := s.authorizer.Can(ctx, actorID, tenantID.String(), permission.TenantsMembersManage)
		if !can {
			return TenantMemberResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk mengelola anggota workspace (tenants.members.manage)")
		}
	}

	user, err := s.q.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return TenantMemberResponse{}, apperr.NotFound(fmt.Sprintf("user with email '%s' not found", req.Email))
	}

	m, err := s.q.AddTenantMember(ctx, db.AddTenantMemberParams{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     req.Role,
	})
	if err != nil {
		return TenantMemberResponse{}, apperr.Internal("failed to add tenant member", err)
	}

	_ = s.authorizer.AddUserRole(ctx, user.ID, req.Role, tenantID.String())

	if s.notifSvc != nil {
		t, tErr := s.q.GetTenantByID(ctx, tenantID)
		actor, aErr := s.q.GetUserByID(ctx, actorID)
		if tErr == nil {
			actorName := actor.FullName
			if actorName == "" || aErr != nil {
				actorName = actor.Email
			}
			if actorName == "" {
				actorName = "Admin Workspace"
			}
			_, _ = s.notifSvc.CreateNotification(ctx, notification.CreateNotificationRequest{
				UserID:  user.ID,
				Title:   "Undangan Workspace Baru",
				Message: fmt.Sprintf("Anda telah ditambahkan ke workspace '%s' oleh %s.", t.Name, actorName),
				Type:    "workspace",
			})
		}
	}

	return TenantMemberResponse{
		UserID:    user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		AvatarURL: user.AvatarUrl,
		Role:      m.Role,
		CreatedAt: m.CreatedAt,
	}, nil
}

func (s *Service) UpdateTenantMemberRole(ctx context.Context, tenantID uuid.UUID, targetUserID uuid.UUID, req UpdateTenantMemberRoleRequest) (TenantMemberResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantMemberResponse{}, err
	}

	if s.authorizer != nil {
		if actorID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, actorID, tenantID.String(), permission.TenantsMembersManage)
			if !can {
				return TenantMemberResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk mengelola anggota workspace (tenants.members.manage)")
			}
		}
	}

	m, err := s.q.UpdateTenantMemberRole(ctx, db.UpdateTenantMemberRoleParams{
		TenantID: tenantID,
		UserID:   targetUserID,
		Role:     req.Role,
	})
	if err != nil {
		return TenantMemberResponse{}, apperr.Internal("failed to update tenant member role", err)
	}

	user, err := s.q.GetUserByID(ctx, targetUserID)
	if err != nil {
		return TenantMemberResponse{}, apperr.NotFound("user not found")
	}

	_ = s.authorizer.AddUserRole(ctx, targetUserID, req.Role, tenantID.String())
	_ = s.authorizer.SyncPolicies(ctx)

	return TenantMemberResponse{
		UserID:    user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		AvatarURL: user.AvatarUrl,
		Role:      m.Role,
		CreatedAt: m.CreatedAt,
	}, nil
}

func (s *Service) RemoveTenantMember(ctx context.Context, tenantID uuid.UUID, targetUserID uuid.UUID) error {
	if s.authorizer != nil {
		if actorID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, actorID, tenantID.String(), permission.TenantsMembersManage)
			if !can {
				return apperr.Forbidden("anda tidak memiliki izin untuk mengelola anggota workspace (tenants.members.manage)")
			}
		}
	}

	t, tErr := s.q.GetTenantByID(ctx, tenantID)
	targetUser, uErr := s.q.GetUserByID(ctx, targetUserID)
	members, mErr := s.q.ListTenantMembers(ctx, tenantID)

	err := s.q.RemoveTenantMember(ctx, db.RemoveTenantMemberParams{
		TenantID: tenantID,
		UserID:   targetUserID,
	})
	if err != nil {
		return err
	}

	if s.notifSvc != nil && tErr == nil && uErr == nil && mErr == nil {
		memberName := targetUser.FullName
		if memberName == "" {
			memberName = targetUser.Email
		}
		for _, m := range members {
			if m.Role == "owner" && m.UserID != targetUserID {
				_, _ = s.notifSvc.CreateNotification(ctx, notification.CreateNotificationRequest{
					UserID:  m.UserID,
					Title:   "Anggota Meninggalkan Workspace",
					Message: fmt.Sprintf("%s (%s) telah keluar dari workspace '%s'.", memberName, targetUser.Email, t.Name),
					Type:    "workspace",
				})
			}
		}
	}

	return nil
}

func (s *Service) ListTenantRoles(ctx context.Context, tenantID uuid.UUID) ([]TenantRoleResponse, error) {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.RolesRead)
			if !can {
				return nil, apperr.Forbidden("anda tidak memiliki izin untuk melihat peran workspace (roles.read)")
			}
		}
	}

	roles, err := s.q.ListTenantRoles(ctx, &tenantID)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil daftar peran tenant", err)
	}

	res := make([]TenantRoleResponse, len(roles))
	for i, r := range roles {
		pCodes, err := s.q.GetRolePermissions(ctx, r.ID)
		if err != nil {
			pCodes = []string{}
		}

		res[i] = TenantRoleResponse{
			ID:          r.ID,
			TenantID:    r.TenantID,
			Name:        r.Name,
			DisplayName: r.DisplayName,
			Description: r.Description,
			IsSystem:    r.IsSystem,
			Permissions: pCodes,
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   r.UpdatedAt,
		}
	}
	return res, nil
}

func (s *Service) CreateTenantRole(ctx context.Context, tenantID uuid.UUID, req CreateTenantRoleRequest) (TenantRoleResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantRoleResponse{}, err
	}

	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.RolesCreate)
			if !can {
				return TenantRoleResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk membuat peran custom (roles.create)")
			}
		}
	}

	r, err := s.q.CreateRole(ctx, db.CreateRoleParams{
		TenantID:    &tenantID,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		IsSystem:    false,
	})
	if err != nil {
		return TenantRoleResponse{}, apperr.Internal("gagal membuat peran custom tenant: "+err.Error(), err)
	}

	for _, pCode := range req.Permissions {
		_ = s.q.AddRolePermission(ctx, db.AddRolePermissionParams{
			RoleID:         r.ID,
			PermissionCode: pCode,
		})
	}

	_ = s.authorizer.SyncPolicies(ctx)

	pCodes, _ := s.q.GetRolePermissions(ctx, r.ID)

	return TenantRoleResponse{
		ID:          r.ID,
		TenantID:    r.TenantID,
		Name:        r.Name,
		DisplayName: r.DisplayName,
		Description: r.Description,
		IsSystem:    r.IsSystem,
		Permissions: pCodes,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}, nil
}

func (s *Service) UpdateTenantRolePermissions(ctx context.Context, tenantID uuid.UUID, roleID uuid.UUID, req UpdateTenantRolePermissionsRequest) (TenantRoleResponse, error) {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.RolesPermissionsUpdate)
			if !can {
				return TenantRoleResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk memperbarui izin peran (roles.permissions.update)")
			}
		}
	}

	role, err := s.q.GetRoleByID(ctx, roleID)
	if err != nil {
		return TenantRoleResponse{}, apperr.NotFound("peran tidak ditemukan")
	}

	if role.Name == "owner" {
		return TenantRoleResponse{}, apperr.Forbidden("peran owner selalu memiliki akses penuh dan tidak dapat diubah")
	}

	if role.TenantID != nil && *role.TenantID != tenantID {
		return TenantRoleResponse{}, apperr.Forbidden("peran ini bukan milik tenant ini")
	}

	if err := s.q.ClearRolePermissions(ctx, roleID); err != nil {
		return TenantRoleResponse{}, apperr.Internal("gagal memperbarui izin peran", err)
	}

	for _, pCode := range req.Permissions {
		_ = s.q.AddRolePermission(ctx, db.AddRolePermissionParams{
			RoleID:         roleID,
			PermissionCode: pCode,
		})
	}

	_ = s.authorizer.SyncPolicies(ctx)

	pCodes, _ := s.q.GetRolePermissions(ctx, role.ID)

	return TenantRoleResponse{
		ID:          role.ID,
		TenantID:    role.TenantID,
		Name:        role.Name,
		DisplayName: role.DisplayName,
		Description: role.Description,
		IsSystem:    role.IsSystem,
		Permissions: pCodes,
		CreatedAt:   role.CreatedAt,
		UpdatedAt:   role.UpdatedAt,
	}, nil
}

func (s *Service) DeleteTenantRole(ctx context.Context, tenantID uuid.UUID, roleID uuid.UUID) error {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.RolesPermissionsUpdate)
			if !can {
				return apperr.Forbidden("anda tidak memiliki izin untuk menghapus peran (roles.permissions.update)")
			}
		}
	}

	role, err := s.q.GetRoleByID(ctx, roleID)
	if err != nil {
		return apperr.NotFound("peran tidak ditemukan")
	}

	if role.IsSystem {
		return apperr.Forbidden("peran sistem tidak dapat dihapus")
	}

	if role.TenantID == nil || *role.TenantID != tenantID {
		return apperr.Forbidden("peran ini bukan milik tenant ini")
	}

	if err := s.q.DeleteRole(ctx, roleID); err != nil {
		return apperr.Internal("gagal menghapus peran custom", err)
	}

	_ = s.authorizer.SyncPolicies(ctx)

	return nil
}

func (s *Service) UpdateTenant(ctx context.Context, tenantID uuid.UUID, req UpdateTenantRequest) (TenantResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantResponse{}, err
	}

	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.TenantsUpdate)
			if !can {
				return TenantResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk memperbarui workspace (tenants.update)")
			}
		}
	}

	slug := strings.ToLower(strings.TrimSpace(req.Slug))

	var namePtr *string
	if req.Name != "" {
		namePtr = &req.Name
	}
	var slugPtr *string
	if slug != "" {
		slugPtr = &slug
	}

	t, err := s.q.UpdateTenant(ctx, db.UpdateTenantParams{
		ID:   tenantID,
		Name: namePtr,
		Slug: slugPtr,
	})
	if err != nil {
		return TenantResponse{}, apperr.Internal("gagal memperbarui workspace: "+err.Error(), err)
	}

	return TenantResponse{
		ID:        t.ID,
		Name:      t.Name,
		Slug:      t.Slug,
		JoinCode:  t.JoinCode,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}, nil
}

func (s *Service) RegenerateJoinCode(ctx context.Context, tenantID uuid.UUID) (TenantResponse, error) {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.TenantsUpdate)
			if !can {
				return TenantResponse{}, apperr.Forbidden("anda tidak memiliki izin untuk memperbarui workspace (tenants.update)")
			}
		}
	}

	newCode := GenerateJoinCode()
	t, err := s.q.RegenerateTenantJoinCode(ctx, db.RegenerateTenantJoinCodeParams{
		ID:       tenantID,
		JoinCode: newCode,
	})
	if err != nil {
		return TenantResponse{}, apperr.Internal("gagal membuat ulang kode gabung", err)
	}

	return TenantResponse{
		ID:        t.ID,
		Name:      t.Name,
		Slug:      t.Slug,
		JoinCode:  t.JoinCode,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}, nil
}

func (s *Service) DeleteTenant(ctx context.Context, tenantID uuid.UUID) error {
	if s.authorizer != nil {
		if userID, ok := web.UserID(ctx); ok {
			can, _ := s.authorizer.Can(ctx, userID, tenantID.String(), permission.TenantsDelete)
			if !can {
				return apperr.Forbidden("anda tidak memiliki izin untuk menghapus workspace (tenants.delete)")
			}
		}
	}

	if err := s.q.DeleteTenantAdmin(ctx, tenantID); err != nil {
		return apperr.Internal("gagal menghapus workspace", err)
	}
	_ = s.authorizer.SyncPolicies(ctx)
	return nil
}
