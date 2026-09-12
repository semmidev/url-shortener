package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestShouldTrace(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		// Should trace (API & URL Redirects)
		{name: "API v1 Auth Login", path: "/api/v1/auth/login", expected: true},
		{name: "API v1 Short URLs", path: "/api/v1/urls", expected: true},
		{name: "API v1 Tenants", path: "/api/v1/tenants", expected: true},
		{name: "API v1 Analytics", path: "/api/v1/analytics", expected: true},
		{name: "Short Code Redirect", path: "/short123", expected: true},
		{name: "Short Code Preview", path: "/short123/preview", expected: true},
		{name: "Short Code QR", path: "/short123/qr", expected: true},

		// Should NOT trace (Health checks, docs, static assets, etc.)
		{name: "Health legacy", path: "/health", expected: false},
		{name: "Health live", path: "/health/live", expected: false},
		{name: "Health ready", path: "/health/ready", expected: false},
		{name: "Version endpoint", path: "/version", expected: false},
		{name: "Docs scalar root", path: "/docs", expected: false},
		{name: "Docs scalar subpath", path: "/docs/app.js", expected: false},
		{name: "Swagger UI root", path: "/swagger/index.html", expected: false},
		{name: "Swagger spec JSON", path: "/swagger/doc.json", expected: false},
		{name: "Favicon", path: "/favicon.ico", expected: false},
		{name: "JS Bundle Asset", path: "/assets/index-D7s8.js", expected: false},
		{name: "CSS Stylesheet Asset", path: "/assets/index-K3m9.css", expected: false},
		{name: "PNG Image Asset", path: "/logo.png", expected: false},
		{name: "SVG Vector Asset", path: "/vite.svg", expected: false},
		{name: "WOFF2 Font Asset", path: "/fonts/inter.woff2", expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := shouldTrace(tt.path)
			if result != tt.expected {
				t.Errorf("shouldTrace(%q) = %v; want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestTracingMiddlewareSkipsNonAPI(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mw := Tracing("test-service")(nextHandler)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Trace-ID header should NOT be present for skipped endpoints
	if traceID := rec.Header().Get("X-Trace-ID"); traceID != "" {
		t.Errorf("expected no X-Trace-ID header for /health/ready, got %q", traceID)
	}
}
