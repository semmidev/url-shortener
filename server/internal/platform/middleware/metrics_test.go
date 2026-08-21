package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricsMiddleware(t *testing.T) {
	m := metrics.New()
	require.NotNil(t, m)

	r := chi.NewRouter()
	r.Use(customMw.Metrics(m))

	r.Get("/api/v1/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	r.Get("/static/app.js", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("js"))
	})

	// Perform API request
	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusOK, rec.Code)

	// Perform non-API request (should NOT be tracked in HTTP metrics)
	nonApiReq := httptest.NewRequest(http.MethodGet, "/static/app.js", nil)
	nonApiRec := httptest.NewRecorder()
	r.ServeHTTP(nonApiRec, nonApiReq)
	assert.Equal(t, http.StatusOK, nonApiRec.Code)

	// Check metrics output
	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	metricsRec := httptest.NewRecorder()
	m.Handler().ServeHTTP(metricsRec, metricsReq)

	assert.Equal(t, http.StatusOK, metricsRec.Code)
	body := metricsRec.Body.String()
	assert.Contains(t, body, `http_requests_total{method="GET",path="/api/v1/test",status="200"} 1`)
	assert.NotContains(t, body, `/static/app.js`)
}
