# ADR-0012: Redis Cache-Aside & Edge Cache-Control Headers

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

High-volume URL shortening services receive massive read traffic on redirection endpoints (`/{code}`). Querying PostgreSQL for every redirection creates database connection pressure and increases redirect latency. Furthermore, CDN nodes (Cloudflare, Fastly) cannot cache redirection responses without explicit HTTP `Cache-Control` headers.

## Decision

1. **Redis Cache-Aside Pattern**:
   - Implemented `Cache` platform wrapper using `github.com/redis/go-redis/v9`.
   - On URL lookup (`GetByCode`), check Redis key `url:code:<code proposal>`. On cache hit, return immediately without touching PostgreSQL. On cache miss, fetch from PostgreSQL and store in Redis with TTL (`1h`).
   - Automatically invalidate cache key when a short URL is updated (`Update`) or deleted (`Delete`).
2. **Edge Cache-Control Headers**:
   - Set `Cache-Control: public, max-age=300, s-maxage=3600` on public redirection responses in `RedirectHandler.Redirect`.
3. **Database Query Indexing**:
   - Added PostgreSQL `pg_trgm` GIN indexes for fast `ILIKE` wildcard searches on URL titles and destination URLs.
   - Added composite index `(url_id, clicked_at DESC)` for fast analytics queries.

## Consequences

### Positive
- Drastically reduces PostgreSQL read load and latency for popular short links.
- Enables Edge / CDN nodes to serve redirects closer to end-users.
- Substring searches and analytics queries run significantly faster.

### Negative
- Requires running a Redis container alongside PostgreSQL in development and production environments.
