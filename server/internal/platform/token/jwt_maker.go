package token

import (
	"errors"
	"fmt"
	"time"
	"uuid"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken  = errors.New("token is invalid")
	ErrExpiredToken  = errors.New("token has expired")
	ErrSecretKeySize = errors.New("secret key must be at least 32 characters")
)

// Payload contains the payload data of the token.
type Payload struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Role      string    `json:"role"`
	SessionID uuid.UUID `json:"session_id"`
	IssuedAt  time.Time `json:"issued_at"`
	ExpiredAt time.Time `json:"expired_at"`
}

// Valid checks if the token payload is valid or not.
func (payload *Payload) Valid() error {
	if time.Now().After(payload.ExpiredAt) {
		return ErrExpiredToken
	}
	return nil
}

// JWTMaker is a JSON Web Token maker.
type JWTMaker struct {
	secretKey string
}

// NewJWTMaker creates a new JWTMaker.
func NewJWTMaker(secretKey string) (*JWTMaker, error) {
	if len(secretKey) < 32 {
		return nil, ErrSecretKeySize
	}
	return &JWTMaker{secretKey: secretKey}, nil
}

type CustomClaims struct {
	UserID    uuid.UUID `json:"user_id"`
	Role      string    `json:"role"`
	SessionID uuid.UUID `json:"session_id"`
	jwt.RegisteredClaims
}

// CreateToken creates a new token for a specific user and duration.
func (maker *JWTMaker) CreateToken(userID uuid.UUID, role string, sessionID uuid.UUID, duration time.Duration) (string, *Payload, error) {
	tokenID := uuid.NewV7()

	now := time.Now()
	expiredAt := now.Add(duration)

	payload := &Payload{
		ID:        tokenID,
		UserID:    userID,
		Role:      role,
		SessionID: sessionID,
		IssuedAt:  now,
		ExpiredAt: expiredAt,
	}

	claims := CustomClaims{
		UserID:    userID,
		Role:      role,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiredAt),
		},
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := jwtToken.SignedString([]byte(maker.secretKey))
	if err != nil {
		return "", nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenStr, payload, nil
}

// VerifyToken checks if the token is valid or not.
func (maker *JWTMaker) VerifyToken(tokenStr string) (*Payload, error) {
	keyFunc := func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(maker.secretKey), nil
	}

	jwtToken, err := jwt.ParseWithClaims(tokenStr, &CustomClaims{}, keyFunc)
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := jwtToken.Claims.(*CustomClaims)
	if !ok || !jwtToken.Valid {
		return nil, ErrInvalidToken
	}

	tokenID, err := uuid.Parse(claims.ID)
	if err != nil {
		return nil, ErrInvalidToken
	}

	payload := &Payload{
		ID:        tokenID,
		UserID:    claims.UserID,
		Role:      claims.Role,
		SessionID: claims.SessionID,
		IssuedAt:  claims.IssuedAt.Time,
		ExpiredAt: claims.ExpiresAt.Time,
	}

	if err := payload.Valid(); err != nil {
		return nil, err
	}

	return payload, nil
}
