package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
	"github.com/semmidev/url-shortener/server/internal/platform/crypto"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
)

func main() {
	log.Println("🌱 Starting multi-tenant database seeding script...")

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := postgres.NewPool(ctx, postgres.Config{
		Source:   cfg.DBSource,
		MaxConns: 5,
		MinConns: 1,
	})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer pool.Close()

	store := db.NewStore(pool)

	if err := seed(ctx, store); err != nil {
		log.Fatalf("❌ Database seeding failed: %v", err)
	}

	log.Println("✅ Multi-tenant database seeding completed successfully!")
}

func seed(ctx context.Context, store db.Store) error {
	// 1. Seed System Roles
	roles := []struct {
		ID          string
		Name        string
		DisplayName string
		Description string
	}{
		{
			ID:          "00000000-0000-0000-0000-000000000001",
			Name:        "owner",
			DisplayName: "Owner",
			Description: "Pemilik workspace dengan hak akses penuh",
		},
		{
			ID:          "00000000-0000-0000-0000-000000000002",
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Pengelola workspace",
		},
		{
			ID:          "00000000-0000-0000-0000-000000000003",
			Name:        "member",
			DisplayName: "Member",
			Description: "Anggota standar workspace",
		},
	}

	log.Println("📦 Seeding system roles...")
	for _, r := range roles {
		_, _ = store.CreateRole(ctx, db.CreateRoleParams{
			TenantID:    nil,
			Name:        r.Name,
			DisplayName: r.DisplayName,
			Description: r.Description,
			IsSystem:    true,
		})
	}

	// 2. Map Code-Defined Permissions to System Roles
	log.Println("🔑 Mapping code-defined permissions to system roles...")
	if err := permission.SyncPermissions(ctx, store); err != nil {
		log.Printf("⚠️ Warning during permission sync: %v", err)
	}

	// Initialize Casbin Authorizer
	authorizer, _ := authz.NewCasbinAuthorizer(store)

	// 3. Seed Default User Accounts
	hashedPassword, err := crypto.HashPassword("password")
	if err != nil {
		return fmt.Errorf("failed to hash default password: %w", err)
	}

	users := []struct {
		Email    string
		FullName string
	}{
		{
			Email:    "sammidev4@gmail.com",
			FullName: "John Doe",
		},
		{
			Email:    "jane@example.com",
			FullName: "Jane Smith",
		},
	}

	log.Println("👤 Seeding default user accounts...")
	for _, u := range users {
		passwordHash := hashedPassword
		_, _ = store.CreateUser(ctx, db.CreateUserParams{
			Email:        u.Email,
			PasswordHash: &passwordHash,
			FullName:     u.FullName,
		})
	}

	// 4. Seed Multi-Tenant SaaS Organizations
	log.Println("🏢 Seeding sample SaaS tenants...")
	tenantsData := []struct {
		Name     string
		Slug     string
		JoinCode string
	}{
		{Name: "Acme Corporation", Slug: "acme", JoinCode: "ACME01"},
		{Name: "Stark Industries", Slug: "stark", JoinCode: "STRK01"},
	}

	createdTenants := make(map[string]db.Tenant)
	for _, t := range tenantsData {
		tenant, err := store.GetTenantBySlug(ctx, t.Slug)
		if err != nil {
			tenant, err = store.CreateTenant(ctx, db.CreateTenantParams{
				Name:     t.Name,
				Slug:     t.Slug,
				JoinCode: t.JoinCode,
			})
			if err != nil {
				log.Printf("⚠️ Warning creating tenant %s: %v", t.Name, err)
				continue
			}
		}
		createdTenants[t.Slug] = tenant
	}

	// 5. Assign Users to Tenants
	johnUser, johnErr := store.GetUserByEmail(ctx, "sammidev4@gmail.com")
	janeUser, janeErr := store.GetUserByEmail(ctx, "jane@example.com")
	acme, hasAcme := createdTenants["acme"]
	stark, hasStark := createdTenants["stark"]

	if johnErr == nil && hasAcme {
		_, _ = store.AddTenantMember(ctx, db.AddTenantMemberParams{
			TenantID: acme.ID,
			UserID:   johnUser.ID,
			Role:     "owner",
		})
		_ = authorizer.AddUserRole(ctx, johnUser.ID, "owner", acme.ID.String())
	}
	if janeErr == nil && hasAcme {
		_, _ = store.AddTenantMember(ctx, db.AddTenantMemberParams{
			TenantID: acme.ID,
			UserID:   janeUser.ID,
			Role:     "member",
		})
		_ = authorizer.AddUserRole(ctx, janeUser.ID, "member", acme.ID.String())
	}
	if janeErr == nil && hasStark {
		_, _ = store.AddTenantMember(ctx, db.AddTenantMemberParams{
			TenantID: stark.ID,
			UserID:   janeUser.ID,
			Role:     "owner",
		})
		_ = authorizer.AddUserRole(ctx, janeUser.ID, "owner", stark.ID.String())
	}
	if johnErr == nil && hasStark {
		_, _ = store.AddTenantMember(ctx, db.AddTenantMemberParams{
			TenantID: stark.ID,
			UserID:   johnUser.ID,
			Role:     "admin",
		})
		_ = authorizer.AddUserRole(ctx, johnUser.ID, "admin", stark.ID.String())
	}

	// 6. Seed Sample Short URLs
	if johnErr == nil && janeErr == nil && hasAcme {
		log.Println("🔗 Seeding sample short URLs...")
		sampleURLs := []struct {
			UserID      *uuid.UUID
			TenantID    *uuid.UUID
			ShortCode   string
			OriginalURL string
			Title       string
		}{
			{
				UserID:      &johnUser.ID,
				TenantID:    &acme.ID,
				ShortCode:   "acme-docs",
				OriginalURL: "https://github.com/semmidev/url-shortener",
				Title:       "Acme Documentation Link",
			},
			{
				UserID:      &janeUser.ID,
				TenantID:    &acme.ID,
				ShortCode:   "acme-portal",
				OriginalURL: "https://go.dev/doc/",
				Title:       "Acme Customer Portal",
			},
		}

		for _, item := range sampleURLs {
			_, _ = store.CreateShortURL(ctx, db.CreateShortURLParams{
				UserID:      item.UserID,
				TenantID:    item.TenantID,
				ShortCode:   item.ShortCode,
				OriginalUrl: item.OriginalURL,
				Title:       item.Title,
				IsActive:    true,
			})
		}
	}

	// 7. Seed Default System Configurations
	log.Println("⚙️ Seeding default system configurations...")
	systemConfigs := []struct {
		Key         string
		Value       string
		Description string
	}{
		{
			Key:         "app_info",
			Value:       `{"app_name": "URL Shortener Enterprise SaaS", "description": "Multi-tenant link management platform", "support_email": "support@example.com"}`,
			Description: "General application branding information",
		},
		{
			Key:         "feature_flags",
			Value:       `{"allow_public_registration": true, "enable_multi_tenancy": true, "enable_custom_slug": true, "enable_qr_code": true}`,
			Description: "Global system feature toggles",
		},
	}

	for _, cfgItem := range systemConfigs {
		_, _ = store.UpsertSystemConfig(ctx, db.UpsertSystemConfigParams{
			Key:         cfgItem.Key,
			Value:       cfgItem.Value,
			Description: cfgItem.Description,
		})
	}

	return nil
}
