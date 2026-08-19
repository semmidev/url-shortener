package crypto

import (
	"testing"
)

func BenchmarkPasswordHash(b *testing.B) {
	password := "SecretPassword123!"
	for b.Loop() {
		_, _ = HashPassword(password)
	}
}

func BenchmarkPasswordVerify(b *testing.B) {
	password := "SecretPassword123!"
	hash, err := HashPassword(password)
	if err != nil {
		b.Fatalf("hash failed: %v", err)
	}

	for b.Loop() {
		_ = CheckPassword(password, hash)
	}
}
