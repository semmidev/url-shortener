package main

import (
	"context"
	crand "crypto/rand"
	"fmt"
	"log"
	"math/big"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
)

func randInt(max int) int {
	if max <= 0 {
		return 0
	}
	nBig, err := crand.Int(crand.Reader, big.NewInt(int64(max)))
	if err != nil {
		return 0
	}
	return int(nBig.Int64())
}

func main() {
	ctx := context.Background()

	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	pgPoolConfig := postgres.Config{
		Source:          cfg.DBSource,
		MaxConns:        5,
		MinConns:        1,
		MaxConnIdleTime: 5 * time.Minute,
		MaxConnLifetime: 15 * time.Minute,
	}

	pool, err := postgres.NewPool(ctx, pgPoolConfig)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	store := db.NewStore(pool)
	log.Println("🌱 Starting database seeding...")

	// 1. Seed Users
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	usersData := []db.CreateUserParams{
		{
			Email:        "admin@example.com",
			PasswordHash: pgtype.Text{String: string(hashedPassword), Valid: true},
			FullName:     "System Administrator",
			Role:         "admin",
		},
		{
			Email:        "john@example.com",
			PasswordHash: pgtype.Text{String: string(hashedPassword), Valid: true},
			FullName:     "John Doe",
			Role:         "user",
		},
		{
			Email:        "jane@example.com",
			PasswordHash: pgtype.Text{String: string(hashedPassword), Valid: true},
			FullName:     "Jane Smith",
			Role:         "user",
		},
	}

	seededUsers := make([]db.User, 0, len(usersData))
	for _, u := range usersData {
		user, err := store.GetUserByEmail(ctx, u.Email)
		if err != nil {
			user, err = store.CreateUser(ctx, u)
			if err != nil {
				log.Printf("⚠️ Failed to create user %s: %v", u.Email, err)
				continue
			}
			log.Printf("✅ Created user: %s (%s)", user.FullName, user.Email)
		} else {
			log.Printf("ℹ️ User already exists: %s", user.Email)
		}
		seededUsers = append(seededUsers, user)
	}

	if len(seededUsers) == 0 {
		log.Fatalf("No users available for seeding URLs")
	}

	// 2. Seed Short URLs
	urlsData := []struct {
		shortCode   string
		originalURL string
		title       string
		userID      uuid.UUID
	}{
		{
			shortCode:   "github-repo",
			originalURL: "https://github.com/semmidev/url-shortener",
			title:       "URL Shortener Repository",
			userID:      seededUsers[0].ID,
		},
		{
			shortCode:   "golang-spec",
			originalURL: "https://go.dev/doc/",
			title:       "Go Programming Language Documentation",
			userID:      seededUsers[1].ID,
		},
		{
			shortCode:   "scalar-ui",
			originalURL: "https://github.com/scalar/scalar",
			title:       "Scalar API Reference UI",
			userID:      seededUsers[1].ID,
		},
		{
			shortCode:   "postgres-docs",
			originalURL: "https://www.postgresql.org/docs/",
			title:       "PostgreSQL Official Manual",
			userID:      seededUsers[2].ID,
		},
		{
			shortCode:   "docker-hub",
			originalURL: "https://hub.docker.com/",
			title:       "Docker Hub Registry",
			userID:      seededUsers[2].ID,
		},
	}

	seededURLs := make([]db.ShortUrl, 0, len(urlsData))
	for _, urlData := range urlsData {
		shortURL, err := store.GetShortURLByCode(ctx, urlData.shortCode)
		if err != nil {
			shortURL, err = store.CreateShortURL(ctx, db.CreateShortURLParams{
				UserID:      pgtype.UUID{Bytes: urlData.userID, Valid: true},
				ShortCode:   urlData.shortCode,
				OriginalUrl: urlData.originalURL,
				Title:       urlData.title,
				IsActive:    true,
			})
			if err != nil {
				log.Printf("⚠️ Failed to create short URL %s: %v", urlData.shortCode, err)
				continue
			}
			log.Printf("✅ Created short URL: /%s -> %s", shortURL.ShortCode, shortURL.OriginalUrl)
		} else {
			log.Printf("ℹ️ Short URL already exists: /%s", shortURL.ShortCode)
		}
		seededURLs = append(seededURLs, shortURL)
	}

	// 3. Seed Analytics Events
	deviceTypes := []string{"desktop", "mobile", "tablet"}
	countries := []string{"ID", "US", "SG", "JP", "GB", "DE"}
	referrers := []string{"https://google.com", "https://twitter.com", "https://linkedin.com", "direct"}

	for _, shortURL := range seededURLs {
		clickCount := randInt(20) + 5 // 5 to 25 clicks per URL
		for i := 0; i < clickCount; i++ {
			_, _ = store.RecordClick(ctx, db.RecordClickParams{
				UrlID:      shortURL.ID,
				IpAddress:  fmt.Sprintf("192.168.1.%d", randInt(250)+1),
				UserAgent:  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
				Referrer:   referrers[randInt(len(referrers))],
				DeviceType: deviceTypes[randInt(len(deviceTypes))],
				Country:    countries[randInt(len(countries))],
			})
			_ = store.IncrementClickCount(ctx, shortURL.ID)
		}
		log.Printf("📊 Seeded %d click analytics events for /%s", clickCount, shortURL.ShortCode)
	}

	log.Println("🎉 Seeding completed successfully!")
}
