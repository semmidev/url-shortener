package middleware

import (
	"encoding/hex"
	"net/http"
	"strings"
)

// SecureHeaders adds security-hardening HTTP response headers to every response.
// These headers protect against common web vulnerabilities like XSS, clickjacking,
// MIME sniffing, and information leakage.
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

		// Content Security Policy — strict for API responses
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		// Remove server identification header
		w.Header().Del("Server")

		// HTTP Strict Transport Security — force HTTPS (1 year)
		// Only set in production; will break local HTTP dev if set unconditionally.
		// Reverse proxies / CDNs should set this on their side for production.
		// We set it here so it's present when served directly over TLS.
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

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
