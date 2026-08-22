# ADR security-0004: Dedicated Internal Management Server Isolation for Observability & Profiling

* Status: `Accepted`
* Date: 2026-08-22

## Context

Exposing `/metrics` and `/debug/pprof` endpoints publicly on `0.0.0.0:8080` introduces security risks, including potential information disclosure of internal system metrics, goroutine stack traces, and memory allocations.

While metrics and profiling are vital for cluster monitoring and performance diagnostics (including Go 1.27's new `/debug/pprof/goroutineleak` endpoint), they must not be exposed to unauthenticated public internet traffic.

## Decision

We isolated management and observability endpoints onto a dedicated internal HTTP server:

1. **Public API Router (`0.0.0.0:8080`)**:
   - Removed public routes for `/metrics` and `/debug/pprof`.
2. **Dedicated Internal Management Server (`BuildManagementRouter`)**:
   - Created a separate HTTP router listening exclusively on `127.0.0.1:9090` (configurable via `MANAGEMENT_ADDRESS`).
   - Serves `/metrics` (Prometheus) and `/debug/pprof/*` (Go 1.27 profiling tools).

## Consequences

- Zero public exposure of sensitive runtime metrics and profiling endpoints.
- Compliance with security best practices by isolating management interfaces to loopback or private cluster network boundaries.
- Full compatibility with internal Prometheus scrape jobs and Go 1.27 diagnostic tooling.
