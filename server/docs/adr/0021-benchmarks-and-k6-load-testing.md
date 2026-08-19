# ADR-0021: Benchmark Testing & k6 Performance Engineering

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

To guarantee high throughput, low latency, and stability under heavy traffic, the application requires quantifiable micro-benchmarks for critical operations (JWT verification, Base62 generation, caching) and full-system load/stress testing scripts with defined Service Level Objectives (SLOs).

## Decision

We implemented Go benchmark tests and a k6 load testing suite:
1. **Go Benchmark Suite (`server/internal/benchmark/benchmark_test.go`)**:
   - `BenchmarkJWTVerify`: Verified token verification latency (~6.6 µs/op).
   - `BenchmarkBase62Generate`: Verified Base62 code generation speed (~2.0 µs/op).
   - `BenchmarkPasswordHash`: Verified bcrypt security/performance bounds.
   - `BenchmarkSyncMapCacheHit`: Verified in-memory lookup overhead (~1.0 µs/op).
2. **k6 Load & Stress Suite (`loadtest/`)**:
   - Configured SLO targets: `p(95) < 50ms`, `p(99) < 100ms`, `http_req_failed < 1%`.
   - `smoke_test.js`: Rapid validation (5 VUs, 30s).
   - `load_test.js`: Ramping load test up to 100 VUs.
   - `stress_test.js`: Extreme load testing up to 500 VUs to identify breaking limits.
3. **Makefile Integration**:
   - `make benchmark`, `make loadtest-smoke`, `make loadtest-load`, `make loadtest-stress`.

## Consequences

### Positive
- Establishes performance baselines for critical execution paths.
- Enforces strict SLO latency targets for production deployments.
- Allows continuous performance regression testing before release.

### Negative
- Stress testing against local development databases requires stopping heavy background tasks.
