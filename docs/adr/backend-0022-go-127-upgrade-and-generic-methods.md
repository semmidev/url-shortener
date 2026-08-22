# ADR backend-0022: Go 1.27 Upgrade & Generic Methods Integration

* Status: `Accepted`
* Date: 2026-08-22

## Context

Go 1.27 introduced generic methods on types, enhancements to `encoding/json/v2`, and new standard library diagnostic capabilities (`/debug/pprof/goroutineleak`). To maintain high code safety, type assertion ergonomics, and leverage performance improvements, the codebase needed to be upgraded to Go 1.27.

Prior to Go 1.27, type assertions for cached values (e.g. `interface{}` or `any` in Redis cache) and request body decoding required separate top-level generic helper functions or unsafe type casts.

## Decision

We upgraded the application compiler and runtime baseline to **Go 1.27.0** across `go.mod`, Dockerfiles, CI workflows, and Makefile:

1. **Go 1.27 Generic Methods on Redis Cache (`RedisCache`)**:
   - `GetTyped[T any](ctx context.Context, key string) (T, error)`: Retrieves and unmarshals cached values directly into generic type `T`.
   - `SetTyped[T any](ctx context.Context, key string, val T, ttl time.Duration) error`: Marshals and caches generic type `T`.

2. **Go 1.27 Generic Request Parser (`RequestParser`)**:
   - `Parse[T any](r *http.Request) (T, error)` & `DecodeTyped[T any](r *http.Request) (T, error)`: Decodes JSON payloads directly into type `T` using Go 1.27 optimized JSON unmarshaling.

3. **Toolchain & Makefile Hardening**:
   - Added `-race` flag to all `go test` invocations in `Makefile` (`go test -race ./...`).

## Consequences

- Type safety across caching and HTTP request parsing with zero reflection overhead or repetitive type assertions.
- Upgraded compiler performance and compatibility with Go 1.27 tooling.
- Automated race detection across all unit and integration tests.
