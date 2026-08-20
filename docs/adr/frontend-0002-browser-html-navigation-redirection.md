# ADR-0025: Browser HTML Navigation Redirection for Inactive and Expired Short URLs

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

When an end-user navigates to an inactive, expired, or non-existent short URL in their web browser (e.g. `http://short.url/inactive-code`), returning a raw JSON error object (`{"success":false,"code":"NOT_FOUND","message":"short URL is inactive"}`) produces a poor user experience. Conversely, returning HTML pages to programmatic REST API clients or automated scrapers breaks JSON client contracts.

## Decision

We updated `RedirectHandler.Redirect` in `server/internal/url/redirect_handler.go` to handle browser HTML navigation gracefully:

1. **Request Header Inspection (`Accept: text/html`)**:
   - Inspects the incoming `Accept` HTTP header on lookup errors.
   - If `Accept` contains `text/html` (indicating browser navigation), the server issues an HTTP 307 Temporary Redirect to `/invalid-url?code={code}&reason={inactive|expired|not_found}`.

2. **Dedicated Frontend Error Page (`InvalidURLPage.jsx`)**:
   - Route `/invalid-url` is registered in React Router (`App.jsx`).
   - Renders a clean UI displaying context-specific details based on `reason` (deactivation vs expiration vs non-existent) and offers navigational links ("Go to Dashboard", "Create Short Link").

3. **REST API Preserved (`Accept: application/json` or cURL)**:
   - Programmatic API requests without `text/html` continue to receive standard HTTP 404 / JSON error responses (`web.Error(w, r, err)`).

4. **Frontend Route Bypass**:
   - `isFrontendRoute(code)` bypasses DB lookups for reserved frontend routes (`login`, `register`, `dashboard`, `auth`, `invalid-url`), directly serving `index.html` to avoid redundant database queries and infinite redirect loops.

## Consequences

### Positive
- Delivers a user-friendly error page when navigating to deactivated, expired, or mistyped short links in a browser.
- Maintains JSON API contracts for HTTP/cURL/mobile clients.
- Prevents database lookup pressure for known frontend SPA routes.

### Negative
- Adds a client-side redirect step (307) for browser navigations on invalid links.
