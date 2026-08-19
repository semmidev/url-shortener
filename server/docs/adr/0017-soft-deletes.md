# ADR-0017: Database Soft Deletes for Short URLs

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Hard-deleting short URLs (`DELETE FROM short_urls`) causes irreversible loss of historical analytics events (`url_analytics`) and audit logs. Users who accidentally delete short links have no option to recover them.

## Decision

We implemented Soft Deletes for short URLs:
1. **Migration (`000003_add_soft_deletes.up.sql`)**:
   - Added `deleted_at TIMESTAMPTZ DEFAULT NULL` column to `short_urls`.
   - Created partial index `idx_short_urls_deleted_at ON short_urls(deleted_at) WHERE deleted_at IS NULL`.
2. **Query Updates**:
   - Active queries (`GetShortURLByCode`, `GetShortURLByID`, `ListUserShortURLs`, etc.) filter out soft-deleted records (`deleted_at IS NULL`).
   - `DeleteShortURL` executes `UPDATE short_urls SET deleted_at = NOW(), is_active = FALSE`.
3. **Restore Endpoint**:
   - Exposed `POST /api/v1/urls/{id}/restore` endpoint to recover soft-deleted links.

## Consequences

### Positive
- Preserves historical click analytics and audit trails for deleted URLs.
- Allows immediate recovery of accidentally deleted links via the restore endpoint.
- Partial index ensures zero query performance degradation on active URLs.

### Negative
- Database storage footprint increases over time as deleted rows remain in table storage.
