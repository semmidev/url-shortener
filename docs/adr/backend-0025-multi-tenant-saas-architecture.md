# ADR-0025: Multi-Tenant SaaS Architecture Transformation

* **Status**: Accepted
* **Date**: 2026-09-07

## Context

The URL Shortener platform previously operated as a single-tenant application where users had personal short URLs without organization boundary controls or multi-tenant scope isolation. To evolve the platform into an enterprise Multi-Tenant SaaS, we needed tenant isolation across the database schema, Casbin authorization decision engine, API routing, and frontend navigation.

## Decision

We transformed the system into a full **Multi-Tenant SaaS Architecture**:

1. **Database Schema & Migrations (`000002_add_multi_tenancy.up.sql`)**:
   - Added `tenants` (`id`, `name`, `slug`, `join_code`, `created_at`, `updated_at`) and `tenant_memberships` (`tenant_id`, `user_id`, `role`, `created_at`).
   - `join_code` is a 6-character uppercase unique string generated per tenant.
   - Added `tenant_id` foreign keys to `short_urls` and `audit_logs`.

2. **Classroom-Style User Onboarding**:
   - Users start with **0 tenants** upon registration (no auto-creation forced).
   - Users can join existing workspaces via 6-character `join_code` (`POST /api/v1/tenants/join`), create a new workspace (`POST /api/v1/tenants`), or be added/invited manually by tenant admins.

3. **Tenant Resolution Middleware (`TenantContext`)**:
   - Resolves active tenant from HTTP header `X-Tenant-ID`.
   - Injects `tenant_id` into request context (`web.WithTenantID(ctx, tenantID)`).

4. **Casbin Domain Scoping**:
   - Utilizes Casbin domain model (`r = sub, dom, obj, act` and `g = _, _, _`) where `dom` = `tenant_id`.
   - Assigns role groupings per tenant (`g, userID, role, tenantID`), allowing tenant owners/admins to grant permissions within their tenant boundary without cross-tenant permission leaks.
   - Super Administrators maintain global wildcard policy access (`p, superadmin, *, *, *, allow`).

5. **Tenant Domain API & Admin Backoffice**:
   - User Tenant API: `GET /api/v1/tenants`, `POST /api/v1/tenants`, `POST /api/v1/tenants/join`, `GET/POST/PUT/DELETE /api/v1/tenants/{id}/members`.
   - Admin Backoffice Tenant Management: `GET /api/v1/admin/tenants`, `POST /api/v1/admin/tenants`, `DELETE /api/v1/admin/tenants/{id}`.

6. **Frontend Integration**:
   - Created `TenantContext` in React SPA managing active workspace state, join code modal, and create workspace modal.
   - Automatically injects `X-Tenant-ID` header into all Axios API requests via request interceptor.
   - Added Workspace Switcher dropdown to `AppSidebar` and Classroom Onboarding Welcome Card on Dashboard Overview.

## Consequences

### Positive
- **Complete SaaS Multi-Tenancy**: Data and permissions are strictly isolated per tenant workspace.
- **Tenant Administration**: Tenant admins/owners can manage members and roles independently within their workspace.
- **Zero Cross-Tenant Leakage**: Short URLs, click analytics, and audit logs are queried with mandatory `tenant_id` scoping.

### Negative
- All API client calls require `X-Tenant-ID` context propagation for multi-workspace users.
