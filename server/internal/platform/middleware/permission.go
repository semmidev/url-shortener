package middleware

import (
	"net/http"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

// RequirePermission creates a middleware that checks if the authenticated user has a specific permission code.
func RequirePermission(queries db.Querier, permissionCode string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := web.UserID(r.Context())
			if !ok {
				web.Error(w, r, apperr.Unauthorized("autentikasi diperlukan"))
				return
			}

			// Superadmin or permitted role check
			hasPerm, err := queries.CheckUserPermission(r.Context(), db.CheckUserPermissionParams{
				ID:   userID,
				Code: permissionCode,
			})
			if err != nil || !hasPerm {
				web.Error(w, r, apperr.Forbidden("akses ditolak: anda tidak memiliki izin '"+permissionCode+"'"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
