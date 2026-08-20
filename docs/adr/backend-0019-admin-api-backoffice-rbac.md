# ADR-0020: Admin API & Role-Based Access Control (RBAC)

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

While the database `users` schema defined a `role` column, the system lacked role enforcement middlewares and administrative API endpoints for user moderation, force-deletion of malicious URLs, and aggregate system metrics.

## Decision

We implemented an Admin API module and RBAC middleware:
1. **Migration (`000005_add_user_suspension.up.sql`)**:
   - Added `is_suspended BOOLEAN NOT NULL DEFAULT FALSE` to `users` table.
2. **RBAC Middleware (`server/internal/platform/middleware/role.go`)**:
   - `RequireRole(allowedRoles ...string)` validates the authenticated user's role from context and returns HTTP 403 `apperr.Forbidden` if unauthorized.
3. **Login Enforcement (`user.Service`)**:
   - Rejects authentication for suspended user accounts (`is_suspended = true`).
4. **Admin Domain Module (`server/internal/admin`)**:
   - `GET /api/v1/admin/users` — Paginated user search and listing.
   - `PUT /api/v1/admin/users/{id}/suspend` — Suspend / unsuspend user accounts.
   - `DELETE /api/v1/admin/urls/{id}` — Force-delete any short URL.
   - `GET /api/v1/admin/stats` — Platform aggregate metrics.

## Consequences

### Positive
- Enables platform administrators to moderate accounts and force-delete malicious links.
- Prevents unauthorized regular users from accessing backoffice routes via strict RBAC.
- Reusable `RequireRole` middleware easily extends to multi-role systems (`editor`, `moderator`).

### Negative
- Requires maintaining role claims within JWT tokens.
