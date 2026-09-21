package app

import (
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
)

// BuildManagementRouter constructs the private internal management router serving /metrics and Go 1.27 /debug/pprof endpoints.
func BuildManagementRouter(appMetrics *metrics.Metrics) chi.Router {
	mr := chi.NewRouter()
	mr.Use(chimw.Recoverer)
	if appMetrics != nil {
		mr.Handle("/metrics", appMetrics.Handler())
	}
	mr.Mount("/debug", chimw.Profiler())
	return mr
}
