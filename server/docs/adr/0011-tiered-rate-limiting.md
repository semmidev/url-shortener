# ADR-0011: Tiered Rate Limiting by Route Classification

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Different API endpoints have vastly different traffic patterns and vulnerability profiles. Authentication endpoints (`/login`, `/register`) are vulnerable to brute-force attacks, while redirection endpoints (`/{code}`) require high throughput. Applying a uniform rate limit across all routes either starves public traffic or leaves auth endpoints vulnerable.

## Decision

Implement tiered rate limiting using `github.com/go-chi/httprate` with client IP canonicalization (`httprate.CanonicalizeIP`):
- **Auth Tier (`/api/v1/auth/*`)**: Strict limit (Default: 10 requests / 1 minute).
- **API Tier (`/api/v1/urls`, `/api/v1/analytics`)**: Standard limit (Default: 100 requests / 1 minute).
- **Public Redirection Tier (`/{code}`)**: High-throughput limit (Default: 300 requests / 1 minute).

Exceeding limits returns a standard `429 Too Many Requests` response with `code: "TOO_MANY_REQUESTS"`.

## Consequences

### Positive
- Protects sensitive authentication routes from brute-force attacks without throttling normal users or public redirection traffic.
- Fully configurable via environment variables (`RATE_LIMIT_AUTH_REQUESTS`, `RATE_LIMIT_API_REQUESTS`, `RATE_LIMIT_PUBLIC_REQUESTS`).

### Negative
- Requires maintaining route tier classification middleware in router setup (`server/internal/app/app.go`).
