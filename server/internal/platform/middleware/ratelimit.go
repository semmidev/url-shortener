package middleware

import (
	"net"
	"net/http"
	"time"

	"github.com/go-chi/httprate"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

func keyByClientIP(r *http.Request) (string, error) {
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	return httprate.CanonicalizeIP(ip), nil
}

// RateLimiter creates a custom httprate rate limiter middleware with standardized web.Error JSON output.
func RateLimiter(requestLimit int, windowLength time.Duration) func(http.Handler) http.Handler {
	return httprate.LimitBy(
		requestLimit,
		windowLength,
		keyByClientIP,
		httprate.WithLimitHandler(func(w http.ResponseWriter, r *http.Request) {
			web.Error(w, r, apperr.TooManyRequests("terlalu banyak permintaan, silakan coba lagi beberapa saat lagi"))
		}),
	)
}
