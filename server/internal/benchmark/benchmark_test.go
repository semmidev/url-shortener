package benchmark_test

import (
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/semmidev/url-shortener/server/internal/platform/crypto"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/url"
)

func BenchmarkJWTVerify(b *testing.B) {
	maker, err := token.NewJWTMaker("secret-key-32-bytes-long-for-jwt-signing!")
	if err != nil {
		b.Fatalf("failed to create JWT maker: %v", err)
	}

	userID := uuid.New()
	sessionID := uuid.New()
	t, _, err := maker.CreateToken(userID, "user", sessionID, 15*time.Minute)
	if err != nil {
		b.Fatalf("failed to create token: %v", err)
	}

	for b.Loop() {
		_, err := maker.VerifyToken(t)
		if err != nil {
			b.Fatalf("verify failed: %v", err)
		}
	}
}

func BenchmarkBase62Generate(b *testing.B) {
	for b.Loop() {
		_, _ = url.GenerateRandomCode(7)
	}
}

func BenchmarkPasswordHash(b *testing.B) {
	password := "SecretPassword123!"
	for b.Loop() {
		_, _ = crypto.HashPassword(password)
	}
}

func BenchmarkPasswordVerify(b *testing.B) {
	password := "SecretPassword123!"
	hash, err := crypto.HashPassword(password)
	if err != nil {
		b.Fatalf("hash failed: %v", err)
	}

	for b.Loop() {
		_ = crypto.CheckPassword(password, hash)
	}
}

func BenchmarkSyncMapCacheHit(b *testing.B) {
	var m sync.Map

	type CachedData struct {
		OriginalURL string `json:"original_url"`
		IsActive    bool   `json:"is_active"`
	}
	data := CachedData{OriginalURL: "https://example.com/long-url-path", IsActive: true}
	bytes, _ := json.Marshal(data)

	m.Store("url:code:abc1234", bytes)

	for b.Loop() {
		if val, ok := m.Load("url:code:abc1234"); ok {
			var out CachedData
			_ = json.Unmarshal(val.([]byte), &out)
		}
	}
}
