package metrics

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds all Prometheus metric collectors for the URL Shortener backend.
type Metrics struct {
	Registry *prometheus.Registry

	// HTTP Metrics
	HTTPRequestsTotal    *prometheus.CounterVec
	HTTPRequestDuration  *prometheus.HistogramVec
	HTTPRequestsInFlight *prometheus.GaugeVec

	// DB Pool Metrics
	DBPoolTotalConns      prometheus.Gauge
	DBPoolAcquiredConns   prometheus.Gauge
	DBPoolIdleConns       prometheus.Gauge
	DBPoolMaxConns        prometheus.Gauge
	DBPoolWaitCount       prometheus.Counter
	DBPoolWaitDurationSec prometheus.Counter

	// Business Metrics
	ShortURLsCreatedTotal *prometheus.CounterVec
	URLRedirectsTotal     *prometheus.CounterVec
	AuthAttemptsTotal     *prometheus.CounterVec

	// Cache Metrics
	CacheHitsTotal   *prometheus.CounterVec
	CacheMissesTotal *prometheus.CounterVec
}

// New creates and registers all system metrics into a new Prometheus registry.
func New() *Metrics {
	reg := prometheus.NewRegistry()

	// Register standard Go runtime and process collectors.
	reg.MustRegister(collectors.NewGoCollector())
	reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))

	m := &Metrics{
		Registry: reg,

		// HTTP Metrics
		HTTPRequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests processed.",
			},
			[]string{"method", "path", "status"},
		),
		HTTPRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request latency histogram in seconds.",
				Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
			},
			[]string{"method", "path", "status"},
		),
		HTTPRequestsInFlight: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "http_requests_in_flight",
				Help: "Current number of HTTP requests being served.",
			},
			[]string{"method"},
		),

		// DB Pool Metrics
		DBPoolTotalConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_pool_total_conns",
				Help: "Total number of connections in the PostgreSQL pool.",
			},
		),
		DBPoolAcquiredConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_pool_acquired_conns",
				Help: "Number of currently acquired connections in the PostgreSQL pool.",
			},
		),
		DBPoolIdleConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_pool_idle_conns",
				Help: "Number of idle connections in the PostgreSQL pool.",
			},
		),
		DBPoolMaxConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_pool_max_conns",
				Help: "Maximum configured connection limit of the PostgreSQL pool.",
			},
		),
		DBPoolWaitCount: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "db_pool_wait_count_total",
				Help: "Total number of times a connection acquisition had to wait.",
			},
		),
		DBPoolWaitDurationSec: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "db_pool_wait_duration_seconds_total",
				Help: "Total seconds waited for a database connection.",
			},
		),

		// Business Metrics
		ShortURLsCreatedTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "short_urls_created_total",
				Help: "Total number of short URLs created.",
			},
			[]string{"status"},
		),
		URLRedirectsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "url_redirects_total",
				Help: "Total number of short URL redirect requests handled.",
			},
			[]string{"status"},
		),
		AuthAttemptsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "auth_attempts_total",
				Help: "Total number of authentication attempts.",
			},
			[]string{"action", "status"},
		),

		// Cache Metrics
		CacheHitsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "cache_hits_total",
				Help: "Total number of cache hits.",
			},
			[]string{"cache_type"},
		),
		CacheMissesTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "cache_misses_total",
				Help: "Total number of cache misses.",
			},
			[]string{"cache_type"},
		),
	}

	reg.MustRegister(
		m.HTTPRequestsTotal,
		m.HTTPRequestDuration,
		m.HTTPRequestsInFlight,
		m.DBPoolTotalConns,
		m.DBPoolAcquiredConns,
		m.DBPoolIdleConns,
		m.DBPoolMaxConns,
		m.DBPoolWaitCount,
		m.DBPoolWaitDurationSec,
		m.ShortURLsCreatedTotal,
		m.URLRedirectsTotal,
		m.AuthAttemptsTotal,
		m.CacheHitsTotal,
		m.CacheMissesTotal,
	)

	return m
}

// Handler returns an http.Handler that serves Prometheus metrics.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.Registry, promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	})
}

// RecordShortURLCreated increments the short URL creation counter.
func (m *Metrics) RecordShortURLCreated(status string) {
	if m == nil || m.ShortURLsCreatedTotal == nil {
		return
	}
	m.ShortURLsCreatedTotal.WithLabelValues(status).Inc()
}

// RecordURLRedirect increments the URL redirect counter by status (e.g., success, not_found, expired, inactive).
func (m *Metrics) RecordURLRedirect(status string) {
	if m == nil || m.URLRedirectsTotal == nil {
		return
	}
	m.URLRedirectsTotal.WithLabelValues(status).Inc()
}

// RecordAuthAttempt increments authentication attempt counters.
func (m *Metrics) RecordAuthAttempt(action, status string) {
	if m == nil || m.AuthAttemptsTotal == nil {
		return
	}
	m.AuthAttemptsTotal.WithLabelValues(action, status).Inc()
}

// RecordCacheHit increments the cache hit counter.
func (m *Metrics) RecordCacheHit(cacheType string) {
	if m == nil || m.CacheHitsTotal == nil {
		return
	}
	m.CacheHitsTotal.WithLabelValues(cacheType).Inc()
}

// RecordCacheMiss increments the cache miss counter.
func (m *Metrics) RecordCacheMiss(cacheType string) {
	if m == nil || m.CacheMissesTotal == nil {
		return
	}
	m.CacheMissesTotal.WithLabelValues(cacheType).Inc()
}

// StartDBMetricsCollector starts a background ticker that periodically updates DB pool connection metrics.
func (m *Metrics) StartDBMetricsCollector(ctx context.Context, pool *pgxpool.Pool, interval time.Duration) {
	if m == nil || pool == nil {
		return
	}

	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.CollectDBStats(pool)
			}
		}
	}()
}

// CollectDBStats updates the DB pool metrics gauges from pool.Stat().
func (m *Metrics) CollectDBStats(pool *pgxpool.Pool) {
	if m == nil || pool == nil {
		return
	}

	stat := pool.Stat()
	m.DBPoolTotalConns.Set(float64(stat.TotalConns()))
	m.DBPoolAcquiredConns.Set(float64(stat.AcquiredConns()))
	m.DBPoolIdleConns.Set(float64(stat.IdleConns()))
	m.DBPoolMaxConns.Set(float64(stat.MaxConns()))
}
