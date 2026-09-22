package middleware

import (
	"net/http"

	"uuid"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

const HeaderTenantID = "X-Tenant-ID"

// TenantContext creates a middleware that resolves the active tenant for the request.
func TenantContext(q db.Querier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			userID, hasUser := web.UserID(ctx)

			// 1. Check if X-Tenant-ID header is present
			tenantHeader := r.Header.Get(HeaderTenantID)
			if tenantHeader != "" {
				if tenantID, err := uuid.Parse(tenantHeader); err == nil {
					ctx = web.WithTenantID(ctx, tenantID)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			// 2. Fallback: resolve user's default/first tenant if authenticated
			if hasUser && q != nil {
				tenants, err := q.ListUserTenants(ctx, userID)
				if err == nil && len(tenants) > 0 {
					ctx = web.WithTenantID(ctx, tenants[0].ID)
				}
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
