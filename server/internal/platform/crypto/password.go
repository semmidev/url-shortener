package crypto

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidHash         = errors.New("invalid Argon2id hash format")
	ErrIncompatibleVersion = errors.New("incompatible Argon2 version")
	ErrMismatchedHash      = errors.New("hashedPassword does not match password")
)

const (
	argon2Memory      uint32 = 19456
	argon2Iterations  uint32 = 2
	argon2Parallelism uint8  = 1
	argon2SaltLength  uint32 = 16
	argon2KeyLength   uint32 = 32
)

// HashPassword returns the Argon2id hash of the password encoded in standard PHC format.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argon2SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate random salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, argon2Iterations, argon2Memory, argon2Parallelism, argon2KeyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, argon2Memory, argon2Iterations, argon2Parallelism, b64Salt, b64Hash)
	return encodedHash, nil
}

// CheckPassword checks if the provided password matches the Argon2id hashed password.
func CheckPassword(password string, hashedPassword string) error {
	parts := strings.Split(hashedPassword, "$")
	if len(parts) != 6 {
		return ErrInvalidHash
	}

	if parts[1] != "argon2id" {
		return ErrInvalidHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidHash, err)
	}
	if version != argon2.Version {
		return ErrIncompatibleVersion
	}

	var memory, iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidHash, err)
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidHash, err)
	}

	decodedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidHash, err)
	}

	computedHash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(decodedHash)))

	if subtle.ConstantTimeCompare(decodedHash, computedHash) != 1 {
		return ErrMismatchedHash
	}

	return nil
}
