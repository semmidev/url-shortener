package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"uuid"

	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

func TestRequireRole(t *testing.T) {
	mw := customMw.RequireRole("admin")

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("Allowed Admin Role", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := web.WithUser(req.Context(), uuid.New(), "admin", uuid.New())

		mw(dummyHandler).ServeHTTP(rec, req.WithContext(ctx))
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("Denied User Role", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := web.WithUser(req.Context(), uuid.New(), "user", uuid.New())

		mw(dummyHandler).ServeHTTP(rec, req.WithContext(ctx))
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 Forbidden, got %d", rec.Code)
		}
	})
}
