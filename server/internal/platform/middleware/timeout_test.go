package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
)

func TestRequestTimeout_ContextDeadline(t *testing.T) {
	handler := customMw.RequestTimeout(50 * time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
			w.WriteHeader(http.StatusGatewayTimeout)
		case <-time.After(200 * time.Millisecond):
			w.WriteHeader(http.StatusOK)
		}
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("expected status 504 GatewayTimeout, got %d", rec.Code)
	}
}
