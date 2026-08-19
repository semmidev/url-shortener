package token

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func BenchmarkJWTVerify(b *testing.B) {
	maker, err := NewJWTMaker("secret-key-32-bytes-long-for-jwt-signing!")
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
