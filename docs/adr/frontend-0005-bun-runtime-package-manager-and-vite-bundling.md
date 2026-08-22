# ADR frontend-0005: Bun Runtime, Package Manager, & Vite Bundling

* Status: `Accepted`
* Date: 2026-08-22

## Context

Frontend dependency installation and build times using standard Node.js (`npm`) introduced unnecessary delay in local development workflows and CI container builds. Additionally, npm install produced verbose script audit warnings.

Bun provides an ultra-fast JavaScript runtime and package manager while preserving full compatibility with Vite for production application bundling.

## Decision

We migrated the frontend build pipeline to **Bun** while preserving **Vite** as the module bundler:

1. **Bun as Package Manager & Runtime**:
   - Replaced `npm install` and `npm run build` with `bun install` and `bun run build`.
   - Generated `bun.lock` binary lockfile migrated from `package-lock.json`.
2. **Makefile Integration**:
   - Configured `BUN_CMD` resolution in `Makefile` (`bun install` + `bun run build`).
3. **Dockerfile Multi-Stage Build Update**:
   - Updated `frontend-builder` stage to use `oven/bun:alpine` official Docker image.

## Consequences

- Dependency installation accelerated from seconds to under 100ms (`bun install` checked 413 packages in 95ms).
- Complete elimination of verbose npm install audit warnings.
- Preserved Vite bundling power and plugin ecosystem.
