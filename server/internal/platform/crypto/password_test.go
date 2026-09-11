package crypto

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestHashPasswordAndCheckPassword(t *testing.T) {
	password := "SecretP@ssw0rd!2026"

	// Hash password
	hash, err := HashPassword(password)
	require.NoError(t, err)
	require.NotEmpty(t, hash)
	require.Contains(t, hash, "$argon2id$v=19$m=19456,t=2,p=1$")

	// Correct password check
	err = CheckPassword(password, hash)
	require.NoError(t, err)

	// Incorrect password check
	err = CheckPassword("WrongPassword123", hash)
	require.Error(t, err)
	require.ErrorIs(t, err, ErrMismatchedHash)
}

func TestCheckPassword_InvalidFormats(t *testing.T) {
	password := "SecretP@ssw0rd!2026"

	tests := []struct {
		name        string
		hash        string
		expectedErr error
	}{
		{
			name:        "empty hash",
			hash:        "",
			expectedErr: ErrInvalidHash,
		},
		{
			name:        "invalid prefix algorithm",
			hash:        "$bcrypt$v=19$m=19456,t=2,p=1$salt$hash",
			expectedErr: ErrInvalidHash,
		},
		{
			name:        "invalid parts length",
			hash:        "$argon2id$v=19$m=19456,t=2,p=1$salt",
			expectedErr: ErrInvalidHash,
		},
		{
			name:        "invalid version",
			hash:        "$argon2id$v=10$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g",
			expectedErr: ErrIncompatibleVersion,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckPassword(password, tt.hash)
			require.Error(t, err)
			require.ErrorIs(t, err, tt.expectedErr)
		})
	}
}
