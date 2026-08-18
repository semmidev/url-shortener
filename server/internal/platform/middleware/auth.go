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

// Auth creates a chi middleware for JWT authentication.
func Auth(tokenMaker *token.JWTMaker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get(authorizationHeaderKey)
			if len(authHeader) == 0 {
				web.Error(w, r, apperr.Unauthorized("authorization header is missing"))
				return
			}

			fields := strings.Fields(authHeader)
			if len(fields) < 2 {
				web.Error(w, r, apperr.Unauthorized("invalid authorization header format"))
				return
			}

			authorizationType := strings.ToLower(fields[0])
			if authorizationType != authorizationTypeBearer {
				web.Error(w, r, apperr.Unauthorized("unsupported authorization type: "+authorizationType))
				return
			}

			accessToken := fields[1]
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
