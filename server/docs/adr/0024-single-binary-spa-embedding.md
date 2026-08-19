# ADR-0024: Single-Binary SPA Embedding with Go `embed.FS`

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Deploying and managing a separate frontend web web-server (e.g. Nginx serving static React JS/CSS assets) alongside a backend Go API service introduces deployment complexity, version drift, and multi-service orchestration overhead. For lightweight production deployment and container distribution, embedding the compiled React SPA into the Go binary provides a self-contained executable.

## Decision

We embedded the compiled frontend SPA directly into the Go executable using Go standard library `embed` package in `server/internal/web/embed.go`:

1. **Embedded Asset Filesystem (`//go:embed all:dist`)**:
   - Compiles the React build output (`web/dist/`) directly into the Go binary.
   - `DistFS()` exposes the filesystem rooted at `dist`.

2. **Custom `SPAHandler`**:
   - `HasFile(path)` checks if a requested physical asset (e.g. `/assets/*`, `/vite.svg`) exists in the embedded filesystem.
   - `ServeHTTP` serves static assets directly when present. When a route does not match a physical file, it falls back to serving `index.html` to enable client-side React Router navigation.
   - Sets cache control headers (`Cache-Control: no-cache, no-store, must-revalidate`) for `index.html` to guarantee instant deployment updates without stale browser caching.

3. **Build Automation (`Makefile`)**:
   - `make build-frontend` runs `npm run build` in `web/` and copies `dist/` into `server/internal/web/dist/` prior to Go binary compilation.

## Consequences

### Positive
- Produces a single, zero-dependency Go binary (`bin/api`) containing both API server and frontend SPA.
- Eliminates CORS issues between frontend and API when deployed together.
- Guarantees version alignment between API handlers and UI components.

### Negative
- Increases Go compiled binary size (~10MB overhead for compressed web assets).
- Requires rebuilding the Go binary whenever frontend source files are modified for production release.
