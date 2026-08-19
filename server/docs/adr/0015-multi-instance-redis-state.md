# ADR-0015: Multi-Instance State Management with Redis

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Running multiple backend API replicas behind a load balancer breaks stateful in-process memory patterns:
1. In-memory rate limiters (`httprate`) enforce quotas per instance rather than globally across the cluster.
2. Single-use OAuth exchange codes stored in `sync.Map` fail if the token exchange request lands on a different replica than the authorization callback.
3. Account lockout counters for brute-force prevention stored in `sync.Map` can be bypassed by hitting different replicas.

## Decision

We migrated all transient state to Redis:
1. **Redis Rate Limiting Middleware (`RedisRateLimiter`)**:
   - Enforces global rate limits across all replicas using atomic Redis `INCR` + `EXPIRE` keys (`ratelimit:<prefix>:<ip>`).
   - Falls back gracefully to `httprate` if Redis is offline.
2. **Redis OAuth One-Time Code Store**:
   - Stores single-use exchange tokens in Redis (`oauth:code:<code>`) with a 5-minute TTL.
   - Falls back to `sync.Map` if Redis is offline.
3. **Redis Failed Login Lockout**:
   - Tracks failed login attempts in Redis (`auth:failed:<email>`) with a 15-minute TTL.
   - Falls back to `sync.Map` if Redis is offline.

## Consequences

### Positive
- Fully stateless backend API instances ready for horizontal auto-scaling (`HPA`).
- Consistent global rate limiting and brute force protection across cluster replicas.
- High availability with graceful fallback to local memory if Redis experiences outage.

### Negative
- Depends on Redis connectivity for multi-replica state sync.
