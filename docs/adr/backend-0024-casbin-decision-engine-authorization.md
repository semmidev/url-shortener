# ADR-0024: Casbin Decision Engine Authorization Architecture

* **Status**: Accepted
* **Date**: 2026-09-07

## Context

Prior to this decision, authorization enforcement relied on direct SQL permission checks (`CheckUserPermission`) and hardcoded role checks (`RequireRole`) scattered across backend HTTP handlers. This tightly coupled access control rules to database queries and route definitions, making it difficult to support dynamic role changes, custom role creations, or multi-tenant domain scoping without changing application code.

## Decision

We replaced the legacy decision engine with a decoupled, high-performance **Casbin v2 Decision Engine** (`github.com/casbin/casbin/v2`), adopting the architecture best practices outlined in our domain plan:

1. **Platform Authorization Package (`server/internal/platform/authz`)**:
   - Encapsulated authorization logic behind an `Authorizer` interface (`Can`, `Enforce`, `GetPermissionsForUser`, `SyncPolicies`, `AddUserRole`).
   - Implemented `CasbinAuthorizer` backed by `casbin.SyncedEnforcer` for thread-safe concurrent evaluation.

2. **Domain & Scoped RBAC Model (`model.conf`)**:
   - Defined a domain-aware RBAC model with wildcard matching capability:
     ```ini
     [request_definition]
     r = sub, dom, obj, act

     [policy_definition]
     p = sub, dom, obj, act, eft

     [role_definition]
     g = _, _, _

     [policy_effect]
     e = some(where (p.eft == allow))

     [matchers]
     m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)
     ```
   - Automatically maps application permission codes (e.g. `urls.read`, `users.suspend`) to `(module, action)` pairs.

3. **Dynamic Database Policy Synchronization**:
   - Synchronizes database roles and permission matrices (`roles`, `role_permissions`) into Casbin memory on startup.
   - Automatically triggers `SyncPolicies` or `AddUserRole` when administrators modify roles or permissions dynamically via backoffice APIs.

4. **Decoupled Security Boundary vs. UX Boundary**:
   - **Backend (Security Boundary)**: Middleware (`RequirePermission`) invokes `authorizer.Can(...)` before serving request handlers, returning HTTP 403 `apperr.Forbidden` on denial.
   - **Frontend (UX Boundary)**: Exposes active permission arrays via `/api/v1/auth/me` (`GetPermissionsForUser`), allowing React components and sidebar navigation (`PermissionGuard`, `usePermission`) to render elements dynamically without hardcoded role strings.

5. **Legacy Cleanup**:
   - Deprecated and removed obsolete SQL `CheckUserPermission` queries and `RequireRole` middleware.

## Consequences

### Positive
- **Decoupled Architecture**: Domain services and handlers interact solely with the `Authorizer` interface, completely hiding Casbin internals.
- **Dynamic RBAC & Multi-tenant Ready**: Domain-aware structure (`r = sub, dom, obj, act`) supports multi-tenancy and instant policy updates without restarting backend services.
- **Performance**: High-speed, in-memory evaluation using `SyncedEnforcer` eliminates repetitive SQL permission joins on every request.
- **Pure Permission-Based UI**: Eliminates hardcoded `user.role === 'admin'` checks on frontend, ensuring custom tenant roles work seamlessly.

### Negative
- Increases memory footprint slightly to maintain active policies in `SyncedEnforcer`.
- Requires policy synchronization when database roles/permissions are mutated out-of-band.
