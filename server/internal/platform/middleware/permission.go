package middleware

import (
	"net/http"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

// RequirePermission creates a middleware that checks if the authenticated user has a specific permission code via Casbin Authorizer.
func RequirePermission(authorizer authz.Authorizer, permissionCode string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := web.UserID(r.Context())
			if !ok {
				web.Error(w, r, apperr.Unauthorized("autentikasi diperlukan"))
				return
			}

			// Casbin Authorizer Check
			hasPerm, err := authorizer.Can(r.Context(), userID, authz.DefaultDomain, permissionCode)
			if err != nil || !hasPerm {
				web.Error(w, r, apperr.Forbidden("akses ditolak: anda tidak memiliki izin '"+permissionCode+"'"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
