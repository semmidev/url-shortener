# ADR backend-0021: Prometheus Metrics Instrumentation & `/metrics` Scrape Endpoint

* Status: `Accepted`
* Date: 2026-08-21

## Context

Observability is essential for operating the URL Shortener backend in high-concurrency production environments. While structured wide-event logging provided request traceability, the platform lacked real-time metric collection for tracking HTTP request latencies, error distributions, database connection pool statistics, Redis cache efficiency, and domain business activities (short URLs created, redirect counts, auth attempts).

Adding metrics without low-cardinality label controls could cause memory bloat and degrade Prometheus scraper performance when exposed to high volumes of parametrized routes (e.g. `/api/v1/urls/{id}`).

## Decision

We implemented standard Prometheus metrics using `github.com/prometheus/client_golang` (`collectors.NewGoCollector()`, `collectors.NewProcessCollector()`) and exposed a scrape endpoint at `GET /metrics`.

Key components:
1. **Platform Metrics Package (`server/internal/platform/metrics`)**:
   - `http_requests_total`: Counter by `(method, path, status)`.
   - `http_request_duration_seconds`: Histogram with standard latency buckets (`.005` to `10s`).
   - `http_requests_in_flight`: Gauge measuring current active requests.
   - `db_pool_*`: Connection pool metrics (`total`, `acquired`, `idle`, `max`, `wait_count`).
   - `short_urls_created_total`, `url_redirects_total`, `auth_attempts_total`, `cache_hits_total`, `cache_misses_total`.
2. **Chi Route Pattern Middleware**:
   - Extracted `chi.RouteContext(r.Context()).RoutePattern()` (e.g., `/api/v1/urls/{id}`) instead of raw path parameters to enforce low label cardinality.
3. **Database Pool Stats Sampler**:
   - Periodic background ticker updating `pgxpool.Pool` connection statistics into gauges.

## Consequences

- Real-time Prometheus/Grafana visibility into request rates, latencies, database pool health, cache hit ratios, and URL creation activity.
- Exposing `GET /metrics` provides an industry-standard scrape target for Kubernetes and Prometheus infrastructure.
- Standardized low label cardinality prevents metrics explosion under high traffic.
