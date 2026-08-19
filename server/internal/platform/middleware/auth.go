package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

const (
	authorizationHeaderKey  = "authorization"
	authorizationTypeBearer = "bearer"
)

// Auth creates a chi middleware for JWT authentication supporting both
// Authorization header (Bearer token) and secure cookies (access_token or token).
func Auth(tokenMaker *token.JWTMaker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			accessToken, err := extractToken(r)
			if err != nil {
				web.Error(w, r, err)
				return
			}

			payload, err := tokenMaker.VerifyToken(accessToken)
			if err != nil {
				if errors.Is(err, token.ErrExpiredToken) {
					web.Error(w, r, apperr.Unauthorized("token has expired"))
					return
				}
				web.Error(w, r, apperr.Unauthorized("invalid token"))
				return
			}

			ctx := web.WithUser(r.Context(), payload.UserID, payload.Role, payload.SessionID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func extractToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get(authorizationHeaderKey)
	if len(authHeader) > 0 {
		fields := strings.Fields(authHeader)
		if len(fields) >= 2 {
			authorizationType := strings.ToLower(fields[0])
			if authorizationType == authorizationTypeBearer {
				return fields[1], nil
			}
		}
	}

	if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
		return cookie.Value, nil
	}
	if cookie, err := r.Cookie("token"); err == nil && cookie.Value != "" {
		return cookie.Value, nil
	}

	if len(authHeader) > 0 {
		return "", apperr.Unauthorized("invalid authorization header format")
	}

	return "", apperr.Unauthorized("authorization header or secure cookie is missing")
}
