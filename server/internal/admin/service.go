package admin

import (
	"context"
	"encoding/json"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

type Service struct {
	q db.Querier
}

func NewService(q db.Querier) *Service {
	return &Service{q: q}
}

func uuidToPgUUID(u *uuid.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *u, Valid: true}
}

func pgUUIDToUUIDPtr(p pgtype.UUID) *uuid.UUID {
	if !p.Valid {
		return nil
	}
	u := uuid.UUID(p.Bytes)
	return &u
}

func stringToPgText(s *string) pgtype.Text {
	if s == nil || *s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func pgTextToStringPtr(p pgtype.Text) *string {
	if !p.Valid {
		return nil
	}
	s := p.String
	return &s
}

func (s *Service) ListUsers(ctx context.Context, req ListUsersRequest) (ListUsersResponse, error) {
	search := stringToPgText(&req.Filter.Search)

	total, err := s.q.CountAllUsers(ctx, search)
	if err != nil {
		return ListUsersResponse{}, apperr.Internal("gagal menghitung total pengguna", err)
	}

	users, err := s.q.ListAllUsers(ctx, db.ListAllUsersParams{
		Search:    search,
		LimitVal:  req.Filter.Limit,
		OffsetVal: req.Filter.GetOffset(),
	})
	if err != nil {
		return ListUsersResponse{}, apperr.Internal("gagal mengambil daftar pengguna", err)
	}

	res := make([]AdminUserResponse, len(users))
	for i, u := range users {
		res[i] = AdminUserResponse{
			ID:          u.ID,
			Email:       u.Email,
			FullName:    u.FullName,
			Role:        u.Role,
			IsSuspended: u.IsSuspended,
			CreatedAt:   u.CreatedAt,
			UpdatedAt:   u.UpdatedAt,
		}
	}

	return ListUsersResponse{
		Users: res,
		Meta:  web.CalculateMeta(total, req.Filter.Page, req.Filter.Limit),
	}, nil
}

func (s *Service) SetUserSuspended(ctx context.Context, req SuspendUserRequest) (AdminUserResponse, error) {
	u, err := s.q.SetUserSuspended(ctx, db.SetUserSuspendedParams{
		ID:          req.UserID,
		IsSuspended: req.IsSuspended,
	})
	if err != nil {
		return AdminUserResponse{}, apperr.Internal("gagal memperbarui status pembekuan akun", err)
	}

	return AdminUserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FullName:    u.FullName,
		Role:        u.Role,
		IsSuspended: u.IsSuspended,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}, nil
}

func (s *Service) UpdateUserRole(ctx context.Context, req UpdateUserRoleRequest) (AdminUserResponse, error) {
	u, err := s.q.UpdateUserRole(ctx, db.UpdateUserRoleParams{
		ID:   req.UserID,
		Role: req.Role,
	})
	if err != nil {
		return AdminUserResponse{}, apperr.Internal("gagal memperbarui peran pengguna", err)
	}

	return AdminUserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FullName:    u.FullName,
		Role:        u.Role,
		IsSuspended: u.IsSuspended,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}, nil
}

func (s *Service) RevokeUserSessions(ctx context.Context, userID uuid.UUID) error {
	return s.q.DeleteSessionsByUserID(ctx, userID)
}

func (s *Service) GetSystemStats(ctx context.Context) (SystemStatsResponse, error) {
	stats, err := s.q.GetSystemStats(ctx)
	if err != nil {
		return SystemStatsResponse{}, apperr.Internal("gagal mengambil statistik sistem", err)
	}

	return SystemStatsResponse{
		TotalUsers:      stats.TotalUsers,
		TotalURLs:       stats.TotalUrls,
		TotalActiveURLs: stats.TotalActiveUrls,
		TotalClicks:     stats.TotalClicks,
	}, nil
}

func (s *Service) ForceDeleteURL(ctx context.Context, urlID uuid.UUID) error {
	return s.q.DeleteShortURL(ctx, db.DeleteShortURLParams{
		ID:     urlID,
		UserID: pgtype.UUID{Valid: false},
	})
}

func (s *Service) ListGlobalLinks(ctx context.Context, filter web.Filter) (ListGlobalLinksResponse, error) {
	search := stringToPgText(&filter.Search)

	total, err := s.q.CountGlobalLinks(ctx, search)
	if err != nil {
		return ListGlobalLinksResponse{}, apperr.Internal("gagal menghitung total link", err)
	}

	links, err := s.q.ListGlobalLinks(ctx, db.ListGlobalLinksParams{
		Search:    search,
		LimitVal:  filter.Limit,
		OffsetVal: filter.GetOffset(),
	})
	if err != nil {
		return ListGlobalLinksResponse{}, apperr.Internal("gagal mengambil daftar link global", err)
	}

	res := make([]GlobalLinkResponse, len(links))
	for i, l := range links {
		userEmail := ""
		if l.UserEmail.Valid {
			userEmail = l.UserEmail.String
		}
		var expiresAt *time.Time
		if l.ExpiresAt.Valid {
			t := l.ExpiresAt.Time
			expiresAt = &t
		}
		res[i] = GlobalLinkResponse{
			ID:          l.ID,
			UserID:      pgUUIDToUUIDPtr(l.UserID),
			UserEmail:   userEmail,
			ShortCode:   l.ShortCode,
			OriginalURL: l.OriginalUrl,
			Title:       l.Title,
			IsActive:    l.IsActive,
			ClickCount:  l.ClickCount,
			ExpiresAt:   expiresAt,
			CreatedAt:   l.CreatedAt,
			UpdatedAt:   l.UpdatedAt,
		}
	}

	return ListGlobalLinksResponse{
		Links: res,
		Meta:  web.CalculateMeta(total, filter.Page, filter.Limit),
	}, nil
}

func (s *Service) SetURLActiveStatus(ctx context.Context, id uuid.UUID, isActive bool) error {
	_, err := s.q.SetURLActiveStatus(ctx, db.SetURLActiveStatusParams{
		ID:       id,
		IsActive: isActive,
	})
	if err != nil {
		return apperr.Internal("gagal mengubah status link", err)
	}
	return nil
}

func (s *Service) ListRoles(ctx context.Context) ([]RoleResponse, error) {
	roles, err := s.q.ListRoles(ctx)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil daftar peran", err)
	}

	res := make([]RoleResponse, len(roles))
	for i, r := range roles {
		perms, err := s.q.GetRolePermissions(ctx, r.ID)
		if err != nil {
			perms = []db.Permission{}
		}

		permRes := make([]PermissionResponse, len(perms))
		for j, p := range perms {
			permRes[j] = PermissionResponse{
				ID:          p.ID,
				Code:        p.Code,
				Module:      p.Module,
				Action:      p.Action,
				Description: p.Description,
			}
		}

		res[i] = RoleResponse{
			ID:          r.ID,
			Name:        r.Name,
			DisplayName: r.DisplayName,
			Description: r.Description,
			IsSystem:    r.IsSystem,
			Permissions: permRes,
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   r.UpdatedAt,
		}
	}

	return res, nil
}

func (s *Service) CreateRole(ctx context.Context, req CreateRoleRequest) (RoleResponse, error) {
	r, err := s.q.CreateRole(ctx, db.CreateRoleParams{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
	})
	if err != nil {
		return RoleResponse{}, apperr.Internal("gagal membuat peran baru", err)
	}

	allPerms, _ := s.q.ListPermissions(ctx)
	permMap := make(map[string]uuid.UUID)
	for _, p := range allPerms {
		permMap[p.Code] = p.ID
	}

	for _, pCode := range req.Permissions {
		if pID, ok := permMap[pCode]; ok {
			_ = s.q.AddRolePermission(ctx, db.AddRolePermissionParams{
				RoleID:       r.ID,
				PermissionID: pID,
			})
		}
	}

	return s.getRoleByID(ctx, r.ID)
}

func (s *Service) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, req UpdateRolePermissionsRequest) (RoleResponse, error) {
	if err := s.q.ClearRolePermissions(ctx, roleID); err != nil {
		return RoleResponse{}, apperr.Internal("gagal memperbarui izin peran", err)
	}

	allPerms, _ := s.q.ListPermissions(ctx)
	permMap := make(map[string]uuid.UUID)
	for _, p := range allPerms {
		permMap[p.Code] = p.ID
	}

	for _, pCode := range req.Permissions {
		if pID, ok := permMap[pCode]; ok {
			_ = s.q.AddRolePermission(ctx, db.AddRolePermissionParams{
				RoleID:       roleID,
				PermissionID: pID,
			})
		}
	}

	return s.getRoleByID(ctx, roleID)
}

func (s *Service) getRoleByID(ctx context.Context, roleID uuid.UUID) (RoleResponse, error) {
	r, err := s.q.GetRoleByID(ctx, roleID)
	if err != nil {
		return RoleResponse{}, apperr.NotFound("peran tidak ditemukan")
	}

	perms, _ := s.q.GetRolePermissions(ctx, r.ID)
	permRes := make([]PermissionResponse, len(perms))
	for j, p := range perms {
		permRes[j] = PermissionResponse{
			ID:          p.ID,
			Code:        p.Code,
			Module:      p.Module,
			Action:      p.Action,
			Description: p.Description,
		}
	}

	return RoleResponse{
		ID:          r.ID,
		Name:        r.Name,
		DisplayName: r.DisplayName,
		Description: r.Description,
		IsSystem:    r.IsSystem,
		Permissions: permRes,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}, nil
}

func (s *Service) ListPermissions(ctx context.Context) ([]PermissionResponse, error) {
	perms, err := s.q.ListPermissions(ctx)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil daftar izin", err)
	}

	res := make([]PermissionResponse, len(perms))
	for i, p := range perms {
		res[i] = PermissionResponse{
			ID:          p.ID,
			Code:        p.Code,
			Module:      p.Module,
			Action:      p.Action,
			Description: p.Description,
		}
	}
	return res, nil
}

func (s *Service) ListNavigationMenus(ctx context.Context) ([]NavigationMenuResponse, error) {
	menus, err := s.q.ListNavigationMenus(ctx)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil daftar menu navigasi", err)
	}

	return buildMenuTree(menus), nil
}

func (s *Service) GetUserPermittedMenus(ctx context.Context, userID uuid.UUID) ([]NavigationMenuResponse, error) {
	menus, err := s.q.ListNavigationMenus(ctx)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil menu pengguna", err)
	}

	userPerms, err := s.q.GetUserRolePermissions(ctx, userID)
	if err != nil {
		userPerms = []string{}
	}
	permMap := make(map[string]bool)
	for _, p := range userPerms {
		permMap[p] = true
	}

	user, _ := s.q.GetUserByID(ctx, userID)

	filtered := make([]db.ListNavigationMenusRow, 0)
	for _, m := range menus {
		if !m.IsActive {
			continue
		}
		if !m.PermissionCode.Valid || m.PermissionCode.String == "" {
			filtered = append(filtered, m)
			continue
		}
		if user.Role == "superadmin" || user.Role == "admin" || permMap[m.PermissionCode.String] {
			filtered = append(filtered, m)
		}
	}

	return buildMenuTree(filtered), nil
}

func buildMenuTree(items []db.ListNavigationMenusRow) []NavigationMenuResponse {
	itemMap := make(map[uuid.UUID]*NavigationMenuResponse)
	var rootUUIDs []uuid.UUID

	// Step 1: Initialize response structs in pointer map
	for _, m := range items {
		itemMap[m.ID] = &NavigationMenuResponse{
			ID:             m.ID,
			ParentID:       pgUUIDToUUIDPtr(m.ParentID),
			Title:          m.Title,
			Path:           m.Path,
			Icon:           m.Icon,
			OrderIndex:     m.OrderIndex,
			IsActive:       m.IsActive,
			IsExternal:     m.IsExternal,
			IsGroup:        m.IsGroup,
			BadgeText:      m.BadgeText,
			PermissionCode: pgTextToStringPtr(m.PermissionCode),
			Children:       []NavigationMenuResponse{},
			CreatedAt:      m.CreatedAt,
			UpdatedAt:      m.UpdatedAt,
		}
	}

	// Step 2: Build child pointer relationships
	childrenMap := make(map[uuid.UUID][]*NavigationMenuResponse)
	for _, m := range items {
		parentUUID := pgUUIDToUUIDPtr(m.ParentID)
		if parentUUID != nil && itemMap[*parentUUID] != nil {
			childrenMap[*parentUUID] = append(childrenMap[*parentUUID], itemMap[m.ID])
		} else {
			rootUUIDs = append(rootUUIDs, m.ID)
		}
	}

	// Step 3: Recursively assemble response tree
	var assemble func(id uuid.UUID) NavigationMenuResponse
	assemble = func(id uuid.UUID) NavigationMenuResponse {
		item := *itemMap[id]
		children := childrenMap[id]
		item.Children = make([]NavigationMenuResponse, len(children))
		for i, child := range children {
			item.Children[i] = assemble(child.ID)
		}
		return item
	}

	res := make([]NavigationMenuResponse, len(rootUUIDs))
	for i, rootID := range rootUUIDs {
		res[i] = assemble(rootID)
	}

	return res
}

func (s *Service) CreateNavigationMenu(ctx context.Context, req CreateMenuRequest) (NavigationMenuResponse, error) {
	m, err := s.q.CreateNavigationMenu(ctx, db.CreateNavigationMenuParams{
		ParentID:       uuidToPgUUID(req.ParentID),
		Title:          req.Title,
		Path:           req.Path,
		Icon:           req.Icon,
		OrderIndex:     req.OrderIndex,
		IsActive:       req.IsActive,
		IsExternal:     req.IsExternal,
		IsGroup:        req.IsGroup,
		BadgeText:      req.BadgeText,
		PermissionCode: stringToPgText(req.PermissionCode),
	})
	if err != nil {
		return NavigationMenuResponse{}, apperr.Internal("gagal membuat item menu baru", err)
	}

	return NavigationMenuResponse{
		ID:             m.ID,
		ParentID:       pgUUIDToUUIDPtr(m.ParentID),
		Title:          m.Title,
		Path:           m.Path,
		Icon:           m.Icon,
		OrderIndex:     m.OrderIndex,
		IsActive:       m.IsActive,
		IsExternal:     m.IsExternal,
		IsGroup:        m.IsGroup,
		BadgeText:      m.BadgeText,
		PermissionCode: pgTextToStringPtr(m.PermissionCode),
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}, nil
}

func (s *Service) UpdateNavigationMenu(ctx context.Context, id uuid.UUID, req CreateMenuRequest) (NavigationMenuResponse, error) {
	m, err := s.q.UpdateNavigationMenu(ctx, db.UpdateNavigationMenuParams{
		ID:             id,
		ParentID:       uuidToPgUUID(req.ParentID),
		Title:          req.Title,
		Path:           req.Path,
		Icon:           req.Icon,
		OrderIndex:     req.OrderIndex,
		IsActive:       req.IsActive,
		IsExternal:     req.IsExternal,
		IsGroup:        req.IsGroup,
		BadgeText:      req.BadgeText,
		PermissionCode: stringToPgText(req.PermissionCode),
	})
	if err != nil {
		return NavigationMenuResponse{}, apperr.Internal("gagal memperbarui item menu", err)
	}

	return NavigationMenuResponse{
		ID:             m.ID,
		ParentID:       pgUUIDToUUIDPtr(m.ParentID),
		Title:          m.Title,
		Path:           m.Path,
		Icon:           m.Icon,
		OrderIndex:     m.OrderIndex,
		IsActive:       m.IsActive,
		IsExternal:     m.IsExternal,
		IsGroup:        m.IsGroup,
		BadgeText:      m.BadgeText,
		PermissionCode: pgTextToStringPtr(m.PermissionCode),
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}, nil
}

func (s *Service) ReorderNavigationMenus(ctx context.Context, req ReorderMenusRequest) error {
	for _, item := range req.Items {
		if err := s.q.UpdateMenuOrderIndex(ctx, db.UpdateMenuOrderIndexParams{
			ID:         item.ID,
			OrderIndex: item.OrderIndex,
			ParentID:   uuidToPgUUID(item.ParentID),
		}); err != nil {
			return apperr.Internal("gagal memperbarui urutan menu", err)
		}
	}
	return nil
}

func (s *Service) DeleteNavigationMenu(ctx context.Context, id uuid.UUID) error {
	return s.q.DeleteNavigationMenu(ctx, id)
}

func (s *Service) ListAuditLogs(ctx context.Context, filter web.Filter) (ListAuditLogsResponse, error) {
	search := stringToPgText(&filter.Search)

	total, err := s.q.CountAuditLogs(ctx, search)
	if err != nil {
		return ListAuditLogsResponse{}, apperr.Internal("gagal menghitung audit log", err)
	}

	logs, err := s.q.ListAuditLogs(ctx, db.ListAuditLogsParams{
		Search:    search,
		LimitVal:  filter.Limit,
		OffsetVal: filter.GetOffset(),
	})
	if err != nil {
		return ListAuditLogsResponse{}, apperr.Internal("gagal mengambil daftar audit log", err)
	}

	res := make([]AuditLogResponse, len(logs))
	for i, l := range logs {
		res[i] = AuditLogResponse{
			ID:         l.ID,
			ActorID:    pgUUIDToUUIDPtr(l.ActorID),
			ActorEmail: l.ActorEmail,
			Action:     l.Action,
			Resource:   l.Resource,
			ResourceID: l.ResourceID,
			Payload:    l.Payload,
			IPAddress:  l.IpAddress,
			UserAgent:  l.UserAgent,
			CreatedAt:  l.CreatedAt,
		}
	}

	return ListAuditLogsResponse{
		Logs: res,
		Meta: web.CalculateMeta(total, filter.Page, filter.Limit),
	}, nil
}

func (s *Service) ListSystemConfigs(ctx context.Context) ([]SystemConfigResponse, error) {
	configs, err := s.q.ListSystemConfigs(ctx)
	if err != nil {
		return nil, apperr.Internal("gagal mengambil konfigurasi sistem", err)
	}

	res := make([]SystemConfigResponse, len(configs))
	for i, c := range configs {
		res[i] = SystemConfigResponse{
			Key:         c.Key,
			Value:       json.RawMessage(c.Value),
			Description: c.Description,
			UpdatedAt:   c.UpdatedAt,
		}
	}
	return res, nil
}

func (s *Service) UpdateSystemConfig(ctx context.Context, key string, req UpdateSystemConfigRequest) (SystemConfigResponse, error) {
	if len(req.Value) == 0 {
		return SystemConfigResponse{}, apperr.Invalid("konfigurasi 'value' tidak boleh kosong")
	}

	// pgx/v5 sends []byte (json.RawMessage) as binary bytea — PostgreSQL rejects cast bytea->jsonb.
	// SQLC jsonb override maps to Go string, so pass string(req.Value) so pgx sends text protocol.
	c, err := s.q.UpsertSystemConfig(ctx, db.UpsertSystemConfigParams{
		Key:         key,
		Value:       string(req.Value),
		Description: req.Description,
	})
	if err != nil {
		return SystemConfigResponse{}, apperr.Internal("gagal memperbarui konfigurasi sistem: "+err.Error(), err)
	}

	return SystemConfigResponse{
		Key:         c.Key,
		Value:       json.RawMessage(c.Value),
		Description: c.Description,
		UpdatedAt:   c.UpdatedAt,
	}, nil
}
