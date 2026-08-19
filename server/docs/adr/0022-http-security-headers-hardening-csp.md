# ADR-0022: HTTP Security Headers Hardening & Route-Tailored Content Security Policy (CSP)

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Web applications and API servers face security threats such as cross-site scripting (XSS), clickjacking, MIME-sniffing, and data injection attacks. While CORS headers were configured for cross-origin AJAX requests, the server lacked comprehensive HTTP security headers to protect browser sessions. Furthermore, applying a uniform Content Security Policy (CSP) across both backend API endpoints and embedded single-page application (SPA) frontends creates either security loopholes or broken client functionality.

## Decision

We implemented a centralized `SecureHeaders` HTTP middleware in `server/internal/platform/middleware/secure_headers.go`:

1. **Standard Hardening Headers**:
   - `X-Content-Type-Options: nosniff` to prevent MIME-type sniffing.
   - `X-Frame-Options: DENY` to prevent clickjacking in frames.
   - `Referrer-Policy: strict-origin-when-cross-origin` to control referrer leakages.
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()` to disable unused browser capabilities.
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS) for HTTPS enforcement.

2. **Route-Tailored Content Security Policy (CSP)**:
   - **API / Health / Version Endpoints (`/api/*`, `/health/*`, `/version`)**: Enforces strict `default-src 'none'; frame-ancestors 'none'; sandbox`.
   - **Interactive Documentation (`/docs`, `/swagger/*`)**: Enables self-hosted assets, CDNs (`cdn.jsdelivr.net`), and inline styles required by Scalar and Swagger UI.
   - **Embedded React SPA & Public Routes (`/`, `/login`, `/{code}`)**: Applies relaxed web CSP allowing self-hosted scripts, styles, web fonts (`Plus Jakarta Sans`), SVG icons, and connect-src endpoints.

## Consequences

### Positive
- Prevents XSS, framing/clickjacking, and MIME sniffing attacks directly at HTTP transport layer.
- Route-tailored CSP ensures APIs remain locked down (`default-src 'none'`) without breaking interactive documentation or embedded React UI.
- Passes security header audits and conforms to OWASP API Security top recommendations.

### Negative
- Require maintaining CSP directives when introducing external web dependencies or analytics scripts in the frontend.
