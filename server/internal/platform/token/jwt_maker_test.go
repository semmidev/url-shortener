package token

import (
	"testing"
	"time"
	"uuid"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTMaker(t *testing.T) {
	secretKey := "12345678901234567890123456789012"
	maker, err := NewJWTMaker(secretKey)
	require.NoError(t, err)

	userID := uuid.New()
	sessionID := uuid.New()
	role := "user"
	duration := time.Minute

	tokenStr, payload, err := maker.CreateToken(userID, role, sessionID, duration)
	require.NoError(t, err)
	require.NotEmpty(t, tokenStr)
	assert.Equal(t, userID, payload.UserID)

	verifiedPayload, err := maker.VerifyToken(tokenStr)
	require.NoError(t, err)
	assert.Equal(t, userID, verifiedPayload.UserID)
	assert.Equal(t, role, verifiedPayload.Role)
	assert.Equal(t, sessionID, verifiedPayload.SessionID)
}

func TestExpiredJWTToken(t *testing.T) {
	secretKey := "12345678901234567890123456789012"
	maker, err := NewJWTMaker(secretKey)
	require.NoError(t, err)

	tokenStr, _, err := maker.CreateToken(uuid.New(), "user", uuid.New(), -time.Minute)
	require.NoError(t, err)

	_, err = maker.VerifyToken(tokenStr)
	require.ErrorIs(t, err, ErrExpiredToken)
}
