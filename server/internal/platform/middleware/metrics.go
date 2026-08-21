package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
)

// Metrics returns a chi HTTP middleware that records request counts, latency distributions, and active in-flight requests.
// It uses Chi route patterns (e.g. /api/v1/urls/{id}) to maintain low label cardinality.
func Metrics(m *metrics.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if m == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Don't record metrics for the Prometheus scrape endpoint itself
			if r.URL.Path == "/metrics" {
				next.ServeHTTP(w, r)
				return
			}

			method := r.Method
			m.HTTPRequestsInFlight.WithLabelValues(method).Inc()
			defer m.HTTPRequestsInFlight.WithLabelValues(method).Dec()

			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			start := time.Now()

			next.ServeHTTP(rw, r)

			duration := time.Since(start).Seconds()
			statusStr := strconv.Itoa(rw.statusCode)

			routePattern := r.URL.Path
			if rctx := chi.RouteContext(r.Context()); rctx != nil {
				if pattern := rctx.RoutePattern(); pattern != "" {
					routePattern = pattern
				}
			}

			m.HTTPRequestsTotal.WithLabelValues(method, routePattern, statusStr).Inc()
			m.HTTPRequestDuration.WithLabelValues(method, routePattern, statusStr).Observe(duration)
		})
	}
}
