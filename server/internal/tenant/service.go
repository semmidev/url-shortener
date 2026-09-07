package tenant

import (
	"context"
	"crypto/rand"
	"fmt"
	"strings"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
)

type Service struct {
	q          db.Querier
	authorizer authz.Authorizer
}

func NewService(q db.Querier, authorizer authz.Authorizer) *Service {
	return &Service{
		q:          q,
		authorizer: authorizer,
	}
}

func GenerateJoinCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b)
}

func (s *Service) ListUserTenants(ctx context.Context, userID uuid.UUID) ([]TenantResponse, error) {
	tenants, err := s.q.ListUserTenants(ctx, userID)
	if err != nil {
		return nil, apperr.Internal("failed to list user tenants", err)
	}

	res := make([]TenantResponse, len(tenants))
	for i, t := range tenants {
		res[i] = TenantResponse{
			ID:        t.ID,
			Name:      t.Name,
			Slug:      t.Slug,
			JoinCode:  t.JoinCode,
			Role:      t.Role,
			CreatedAt: t.CreatedAt,
			UpdatedAt: t.UpdatedAt,
		}
	}
	return res, nil
}

func (s *Service) CreateTenant(ctx context.Context, userID uuid.UUID, req CreateTenantRequest) (TenantResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantResponse{}, err
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
	if s.authorizer != nil {
		_ = s.authorizer.AddUserRole(ctx, userID, "owner", t.ID.String())
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

	if s.authorizer != nil {
		_ = s.authorizer.AddUserRole(ctx, userID, "member", t.ID.String())
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

func (s *Service) AddTenantMember(ctx context.Context, tenantID uuid.UUID, req AddTenantMemberRequest) (TenantMemberResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantMemberResponse{}, err
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

	if s.authorizer != nil {
		_ = s.authorizer.AddUserRole(ctx, user.ID, req.Role, tenantID.String())
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

	if s.authorizer != nil {
		_ = s.authorizer.AddUserRole(ctx, targetUserID, req.Role, tenantID.String())
		_ = s.authorizer.SyncPolicies(ctx)
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

func (s *Service) RemoveTenantMember(ctx context.Context, tenantID uuid.UUID, targetUserID uuid.UUID) error {
	return s.q.RemoveTenantMember(ctx, db.RemoveTenantMemberParams{
		TenantID: tenantID,
		UserID:   targetUserID,
	})
}

func (s *Service) ListTenantRoles(ctx context.Context, tenantID uuid.UUID) ([]TenantRoleResponse, error) {
	roles, err := s.q.ListTenantRoles(ctx, pgtype.UUID{Bytes: tenantID, Valid: true})
	if err != nil {
		return nil, apperr.Internal("gagal mengambil daftar peran tenant", err)
	}

	res := make([]TenantRoleResponse, len(roles))
	for i, r := range roles {
		pCodes, err := s.q.GetRolePermissions(ctx, r.ID)
		if err != nil {
			pCodes = []string{}
		}

		var tID *uuid.UUID
		if r.TenantID.Valid {
			u := uuid.UUID(r.TenantID.Bytes)
			tID = &u
		}

		res[i] = TenantRoleResponse{
			ID:          r.ID,
			TenantID:    tID,
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

	r, err := s.q.CreateRole(ctx, db.CreateRoleParams{
		TenantID:    pgtype.UUID{Bytes: tenantID, Valid: true},
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

	if s.authorizer != nil {
		_ = s.authorizer.SyncPolicies(ctx)
	}

	pCodes, _ := s.q.GetRolePermissions(ctx, r.ID)
	var tID *uuid.UUID
	if r.TenantID.Valid {
		u := uuid.UUID(r.TenantID.Bytes)
		tID = &u
	}

	return TenantRoleResponse{
		ID:          r.ID,
		TenantID:    tID,
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
	role, err := s.q.GetRoleByID(ctx, roleID)
	if err != nil {
		return TenantRoleResponse{}, apperr.NotFound("peran tidak ditemukan")
	}

	if role.Name == "owner" {
		return TenantRoleResponse{}, apperr.Forbidden("peran owner selalu memiliki akses penuh dan tidak dapat diubah")
	}

	if role.TenantID.Valid && role.TenantID.Bytes != tenantID {
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

	if s.authorizer != nil {
		_ = s.authorizer.SyncPolicies(ctx)
	}

	pCodes, _ := s.q.GetRolePermissions(ctx, role.ID)
	var tID *uuid.UUID
	if role.TenantID.Valid {
		u := uuid.UUID(role.TenantID.Bytes)
		tID = &u
	}

	return TenantRoleResponse{
		ID:          role.ID,
		TenantID:    tID,
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
	role, err := s.q.GetRoleByID(ctx, roleID)
	if err != nil {
		return apperr.NotFound("peran tidak ditemukan")
	}

	if role.IsSystem {
		return apperr.Forbidden("peran sistem tidak dapat dihapus")
	}

	if !role.TenantID.Valid || role.TenantID.Bytes != tenantID {
		return apperr.Forbidden("peran ini bukan milik tenant ini")
	}

	if err := s.q.DeleteRole(ctx, roleID); err != nil {
		return apperr.Internal("gagal menghapus peran custom", err)
	}

	if s.authorizer != nil {
		_ = s.authorizer.SyncPolicies(ctx)
	}

	return nil
}

func (s *Service) UpdateTenant(ctx context.Context, tenantID uuid.UUID, req UpdateTenantRequest) (TenantResponse, error) {
	if err := req.Validate(); err != nil {
		return TenantResponse{}, err
	}

	slug := strings.ToLower(strings.TrimSpace(req.Slug))

	t, err := s.q.UpdateTenant(ctx, db.UpdateTenantParams{
		ID:   tenantID,
		Name: pgtype.Text{String: req.Name, Valid: req.Name != ""},
		Slug: pgtype.Text{String: slug, Valid: slug != ""},
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
	if err := s.q.DeleteTenantAdmin(ctx, tenantID); err != nil {
		return apperr.Internal("gagal menghapus workspace", err)
	}
	if s.authorizer != nil {
		_ = s.authorizer.SyncPolicies(ctx)
	}
	return nil
}
