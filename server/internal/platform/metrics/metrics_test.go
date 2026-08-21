package metrics_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetrics_InitializationAndHandler(t *testing.T) {
	m := metrics.New()
	require.NotNil(t, m)
	require.NotNil(t, m.Registry)

	// Test recording business and HTTP metrics
	m.HTTPRequestsTotal.WithLabelValues("GET", "/", "200").Inc()
	m.RecordShortURLCreated("success")
	m.RecordURLRedirect("success")
	m.RecordURLRedirect("not_found")
	m.RecordAuthAttempt("login", "success")
	m.RecordAuthAttempt("login", "failure")
	m.RecordCacheHit("redis")
	m.RecordCacheMiss("redis")

	// Verify HTTP metrics endpoint output
	handler := m.Handler()
	require.NotNil(t, handler)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	body := rec.Body.String()
	assert.Contains(t, body, "short_urls_created_total")
	assert.Contains(t, body, "url_redirects_total")
	assert.Contains(t, body, "auth_attempts_total")
	assert.Contains(t, body, "cache_hits_total")
	assert.Contains(t, body, "cache_misses_total")
	assert.Contains(t, body, "http_requests_total")
	assert.Contains(t, body, "db_pool_total_conns")
}

func TestMetrics_NilSafety(t *testing.T) {
	var m *metrics.Metrics

	// Ensures no panic when metrics is nil
	assert.NotPanics(t, func() {
		m.RecordShortURLCreated("success")
		m.RecordURLRedirect("success")
		m.RecordAuthAttempt("login", "success")
		m.RecordCacheHit("redis")
		m.RecordCacheMiss("redis")
		m.CollectDBStats(nil)
	})
}
