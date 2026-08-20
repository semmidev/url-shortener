# ADR-0026: Comprehensive Cache Invalidation Across Deactivation, Expiry, and Admin Triggers

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Caching short URL lookups in Redis (`url:code:<code proposal> → URLResponse`) speeds up public redirection throughput. However, if a short URL's state is modified (deactivated, deleted, restored, expired by background worker, or force-deleted by an admin), failing to purge the corresponding Redis cache key causes stale responses to be served for up to 1 hour (the cache TTL), leading to authorization and link routing inconsistencies.

## Decision

We implemented immediate Redis cache key invalidation across all short URL state mutation paths in `server/internal/url/service.go` and `server/internal/admin/service.go`:

1. **URL Mutations (`Update`, `Delete`, `Restore`)**:
   - `Update`: Deletes Redis key `url:code:<existing.ShortCode>` after PostgreSQL update.
   - `Delete`: Deletes Redis key `url:code:<existing.ShortCode>` after soft-deletion.
   - `Restore`: Deletes Redis key `url:code:<u.ShortCode>` after restoration.

2. **Bulk Expiration Cleanup Worker (`DeactivateExpiredURLs`)**:
   - Updated `urls.sql` query from `:execresult` to `:many` with `RETURNING short_code`.
   - Modified background ticker worker (`StartExpirationCleanupWorker`) to collect deactivated `short_code`s and iterate `s.cache.Delete(ctx, "url:code:" + code)` to immediately purge expired links from Redis.

3. **Admin Force-Deletion (`ForceDeleteURL`)**:
   - Added Redis `cache.Cache` dependency to admin `Service`.
   - In `ForceDeleteURL`, queries the target link's `short_code` prior to soft-deletion and deletes the Redis cache entry.

## Consequences

### Positive
- Guarantees cache consistency across all URL lifecycle events (user updates, soft-deletions, restorations, background expirations, and admin force-deletes).
- Prevents deactivated or expired links from continuing to redirect end-users via stale Redis cache hits.
- Operates safely under multi-instance horizontal scaling with shared Redis cluster.

### Negative
- Slight additional Redis `DEL` command overhead on URL state updates.
