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
		// 1. API endpoints (/api/*, /health*, /version) return data (JSON) -> strict deny-all policy.
		// 2. Docs pages (/docs, /swagger) load external CDN scripts and inline styles -> docs policy.
		// 3. Web UI / SPA / static assets (/assets/*, /, SPA routes) -> web policy allowing scripts, styles, fonts, images.
		path := r.URL.Path
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/health") || path == "/version" {
			// Strict CSP for pure API endpoints returning JSON
			w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		} else if strings.HasPrefix(path, "/docs") || strings.HasPrefix(path, "/swagger") {
			// Docs pages (/docs, /swagger) load external CDN scripts and use inline styles
			w.Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self' cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; "+
					"style-src 'self' 'unsafe-inline'; "+
					"img-src 'self' data: https:; "+
					"font-src 'self' data: https://fonts.scalar.com; "+
					"connect-src 'self' https: https://api.scalar.com; "+
					"frame-ancestors 'none'",
			)
		} else {
			// Web frontend SPA and static assets (/assets/*, index.html, /vite.svg, SPA routes)
			w.Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net; "+
					"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
					"font-src 'self' data: https://fonts.gstatic.com; "+
					"img-src 'self' data: blob: https:; "+
					"connect-src 'self' https: wss: ws://localhost:* ws://127.0.0.1:*; "+
					"frame-src 'self' blob: https://www.youtube.com; "+
					"frame-ancestors 'self'",
			)
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
