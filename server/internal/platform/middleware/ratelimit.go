package middleware

import (
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/go-chi/httprate"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
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

// RedisRateLimiter creates a multi-instance Redis-backed rate limiter middleware.
func RedisRateLimiter(c cache.Cache, prefix string, requestLimit int, windowLength time.Duration) func(http.Handler) http.Handler {
	if c == nil {
		return RateLimiter(requestLimit, windowLength)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clientIP, _ := keyByClientIP(r)
			key := fmt.Sprintf("ratelimit:%s:%s", prefix, clientIP)

			count, err := c.Incr(r.Context(), key, windowLength)
			if err != nil {
				// Fallback to next handler on Redis error
				next.ServeHTTP(w, r)
				return
			}

			if count > int64(requestLimit) {
				web.Error(w, r, apperr.TooManyRequests("terlalu banyak permintaan, silakan coba lagi beberapa saat lagi"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
