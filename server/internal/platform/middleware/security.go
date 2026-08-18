package middleware

import (
	"encoding/hex"
	"net/http"
	"strings"
)

// SecureHeaders adds security-hardening HTTP response headers to every response.
// It applies a strict Content-Security-Policy for API routes and a relaxed one
// for documentation UIs (/docs, /swagger) which load external scripts and inline styles.
func SecureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Deny embedding in iframes (clickjacking protection)
		w.Header().Set("X-Frame-Options", "DENY")

		// Control referrer information sent to other origins
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Disable browser features not needed by the API
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Remove server identification header
		w.Header().Del("Server")

		// HTTP Strict Transport Security — force HTTPS (1 year)
		// Reverse proxies / CDNs should also set this for production TLS termination.
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Content Security Policy:
		// Docs pages (/docs, /swagger) load external CDN scripts and use inline styles —
		// apply a relaxed CSP limited to those paths only.
		// All other routes (API endpoints) get the strict deny-all policy.
		path := r.URL.Path
		if strings.HasPrefix(path, "/docs") || strings.HasPrefix(path, "/swagger") {
			// Scalar UI loads from cdn.jsdelivr.net; Swagger UI uses inline scripts and styles
			w.Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self' cdn.jsdelivr.net 'unsafe-inline'; "+
					"style-src 'self' 'unsafe-inline'; "+
					"img-src 'self' data: https:; "+
					"font-src 'self' data:; "+
					"connect-src 'self' https:; "+
					"frame-ancestors 'none'",
			)
		} else {
			// Strict CSP for all API and redirect endpoints
			w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		}

		next.ServeHTTP(w, r)
	})
}

// parseTraceparent extracts trace_id and span_id from a W3C traceparent header.
// Format: 00-{trace-id}-{parent-id}-{flags}
// Returns empty strings if the header is absent or malformed.
func parseTraceparent(header string) (traceID, spanID string) {
	parts := strings.Split(header, "-")
	if len(parts) != 4 {
		return "", ""
	}
	rawTrace := parts[1]
	rawSpan := parts[2]
	if len(rawTrace) != 32 || len(rawSpan) != 16 {
		return "", ""
	}
	if _, err := hex.DecodeString(rawTrace); err != nil {
		return "", ""
	}
	if _, err := hex.DecodeString(rawSpan); err != nil {
		return "", ""
	}
	return rawTrace, rawSpan
}
