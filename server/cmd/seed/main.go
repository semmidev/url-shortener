package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
)

func main() {
	log.Println("🌱 Starting database seeding script...")

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

	log.Println("✅ Database seeding completed successfully!")
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
			Name:        "superadmin",
			DisplayName: "Super Administrator",
			Description: "Full system access and security administration",
		},
		{
			ID:          "00000000-0000-0000-0000-000000000002",
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Administrative access for system overview and management",
		},
		{
			ID:          "00000000-0000-0000-0000-000000000003",
			Name:        "user",
			DisplayName: "Regular User",
			Description: "Standard user with short link creation capabilities",
		},
	}

	log.Println("📦 Seeding system roles...")
	for _, r := range roles {
		roleID := parseUUID(r.ID)
		_, err := store.CreateRole(ctx, db.CreateRoleParams{
			Name:        r.Name,
			DisplayName: r.DisplayName,
			Description: r.Description,
		})
		_ = err
		_ = roleID
	}

	// 2. Map Code-Defined Permissions to System Roles (Superadmin, Admin, User)
	log.Println("🔑 Mapping code-defined permissions to system roles...")
	if err := permission.SyncPermissions(ctx, store); err != nil {
		log.Printf("⚠️ Warning during permission sync: %v", err)
	}

	// 3. Seed Default Accounts (Password: "password")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash default password: %w", err)
	}

	users := []struct {
		ID       string
		Email    string
		FullName string
		Role     string
	}{
		{
			ID:       "01a03158-2a33-7c0e-96ba-e839d6c95501",
			Email:    "superadmin@gmail.com",
			FullName: "Super Administrator",
			Role:     "superadmin",
		},
		{
			ID:       "01a03158-2a33-7c0e-96ba-e839d6c9521",
			Email:    "admin@gmail.com",
			FullName: "System Administrator",
			Role:     "admin",
		},
		{
			ID:       "01a03158-2a33-7c0e-96ba-e839d6c9531",
			Email:    "sammidev4@gmail.com",
			FullName: "John Doe",
			Role:     "user",
		},
	}

	log.Println("👤 Seeding default user accounts...")
	for _, u := range users {
		passwordHash := string(hashedPassword)
		_, err := store.CreateUser(ctx, db.CreateUserParams{
			Email:        u.Email,
			PasswordHash: stringToPgText(&passwordHash),
			FullName:     u.FullName,
			Role:         u.Role,
		})
		if err != nil {
			// Update if already exists
			existing, errGet := store.GetUserByEmail(ctx, u.Email)
			if errGet == nil {
				_, _ = store.UpdateUserRole(ctx, db.UpdateUserRoleParams{
					ID:   existing.ID,
					Role: u.Role,
				})
			}
		}
	}

	// 4. Seed Sample Short URLs
	adminUser, errAdmin := store.GetUserByEmail(ctx, "admin@gmail.com")
	regularUser, errUser := store.GetUserByEmail(ctx, "sammidev4@gmail.com")

	if errAdmin == nil && errUser == nil {
		log.Println("🔗 Seeding sample short URLs...")
		sampleURLs := []struct {
			UserID      pgtype.UUID
			ShortCode   string
			OriginalURL string
			Title       string
			Clicks      int64
		}{
			{
				UserID:      uuidToPgUUID(adminUser.ID),
				ShortCode:   "github-repo",
				OriginalURL: "https://github.com/semmidev/url-shortener",
				Title:       "URL Shortener Repository",
				Clicks:      12,
			},
			{
				UserID:      uuidToPgUUID(regularUser.ID),
				ShortCode:   "golang-spec",
				OriginalURL: "https://go.dev/doc/",
				Title:       "Go Programming Language Documentation",
				Clicks:      8,
			},
			{
				UserID:      uuidToPgUUID(regularUser.ID),
				ShortCode:   "scalar-ui",
				OriginalURL: "https://github.com/scalar/scalar",
				Title:       "Scalar API Reference UI",
				Clicks:      15,
			},
		}

		for _, item := range sampleURLs {
			_, _ = store.CreateShortURL(ctx, db.CreateShortURLParams{
				UserID:      item.UserID,
				ShortCode:   item.ShortCode,
				OriginalUrl: item.OriginalURL,
				Title:       item.Title,
			})
		}
	}

	// 5. Seed Default System Configurations
	log.Println("⚙️ Seeding default system configurations...")
	systemConfigs := []struct {
		Key         string
		Value       string
		Description string
	}{
		{
			Key:         "app_info",
			Value:       `{"app_name": "URL Shortener Enterprise", "description": "High performance link management platform", "support_email": "support@example.com"}`,
			Description: "General application branding information",
		},
		{
			Key:         "feature_flags",
			Value:       `{"allow_public_registration": true, "enable_custom_slug": true, "enable_qr_code": true, "maintenance_mode": false}`,
			Description: "Global system feature toggles",
		},
		{
			Key:         "rate_limits",
			Value:       `{"clicks_per_sec": 100, "shortens_per_min": 30}`,
			Description: "Default system-wide API rate limiting thresholds",
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

func parseUUID(s string) pgtype.UUID {
	var uuidVal pgtype.UUID
	_ = uuidVal.Scan(s)
	return uuidVal
}

func uuidToPgUUID(u any) pgtype.UUID {
	var uuidVal pgtype.UUID
	_ = uuidVal.Scan(u)
	return uuidVal
}

func stringToPgText(s *string) pgtype.Text {
	if s == nil || *s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}
