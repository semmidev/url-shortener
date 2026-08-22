# ADR backend-0023: Strict API-Only HTTP Request Logging Filter

* Status: `Accepted`
* Date: 2026-08-22

## Context

The backend wide-event logging middleware (`WideEventLogging`) was capturing all incoming HTTP requests. Because the Go server serves both the React SPA frontend and static assets, every single SPA page navigation (e.g. `/dashboard/urls/*`, `/login`, `/register`) and asset download (`/assets/*.js`, `/assets/*.css`, `/favicon.ico`) was generating `http_request` log lines.

Additionally, sub-routers were re-mounting logging middleware, causing duplicate log entries (`http_request`) for public redirection requests (`GET /{code}`).

This created significant log noise, hiding actual API requests and degrading observability efficiency under user interaction.

## Decision

We updated the `WideEventLogging` middleware to enforce a strict **API-only logging policy**:

1. **`isAPIRequest(path string)` Filter**:
   - Only requests with paths starting with `/api/`, `/health`, `/version`, `/docs`, or `/swagger` generate `http_request` log entries.
   - Non-API requests (SPA page navigations, static assets, and public short code redirects) bypass wide-event logging while remaining fully functional.

2. **Deduplication of Sub-Router Middleware**:
   - Removed duplicate `WideEventLoggingWithSampling` middleware from `redirectRouter` in `app.go`, ensuring single-pass middleware execution.

## Consequences

- Clean, focused server logs containing strictly API transactions, system health checks, and documentation accesses.
- Complete elimination of duplicate log entries and SPA static asset noise.
- Substantially reduced log output volume in development and production log aggregators.
