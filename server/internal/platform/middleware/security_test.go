package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSecureHeaders_CSP(t *testing.T) {
	tests := []struct {
		name                string
		path                string
		expectedContains    string
		expectedNotContains string
	}{
		{
			name:             "API Endpoint receives strict deny-all CSP",
			path:             "/api/v1/urls",
			expectedContains: "default-src 'none'",
		},
		{
			name:             "Health Endpoint receives strict deny-all CSP",
			path:             "/health/ready",
			expectedContains: "default-src 'none'",
		},
		{
			name:             "Version Endpoint receives strict deny-all CSP",
			path:             "/version",
			expectedContains: "default-src 'none'",
		},
		{
			name:             "Docs Endpoint receives docs CSP",
			path:             "/docs",
			expectedContains: "cdn.jsdelivr.net",
		},
		{
			name:             "Swagger Endpoint receives docs CSP",
			path:             "/swagger/index.html",
			expectedContains: "cdn.jsdelivr.net",
		},
		{
			name:                "Root SPA route receives relaxed Web CSP",
			path:                "/",
			expectedContains:    "default-src 'self'",
			expectedNotContains: "default-src 'none'",
		},
		{
			name:                "Static JS asset receives relaxed Web CSP",
			path:                "/assets/index-C1hYymCK.js",
			expectedContains:    "script-src 'self'",
			expectedNotContains: "default-src 'none'",
		},
		{
			name:                "Static SVG asset receives relaxed Web CSP",
			path:                "/vite.svg",
			expectedContains:    "img-src 'self'",
			expectedNotContains: "default-src 'none'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := SecureHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			csp := rec.Header().Get("Content-Security-Policy")
			if csp == "" {
				t.Fatalf("expected Content-Security-Policy header, got empty")
			}

			if tt.expectedContains != "" && !strings.Contains(csp, tt.expectedContains) {
				t.Errorf("expected CSP header to contain %q, got %q", tt.expectedContains, csp)
			}

			if tt.expectedNotContains != "" && strings.Contains(csp, tt.expectedNotContains) {
				t.Errorf("expected CSP header to NOT contain %q, got %q", tt.expectedNotContains, csp)
			}
		})
	}
}
