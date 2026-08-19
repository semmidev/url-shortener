package middleware

import (
	"net/http"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

// RequireRole creates a middleware that checks if the authenticated user has one of the allowed roles.
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool)
	for _, role := range allowedRoles {
		allowed[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := web.UserRole(r.Context())
			if !ok || !allowed[role] {
				web.Error(w, r, apperr.Forbidden("akses ditolak: anda tidak memiliki izin untuk mengakses resource ini"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
