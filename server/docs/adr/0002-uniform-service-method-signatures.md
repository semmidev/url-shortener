# ADR-0002: Uniform Service Method Signatures & DTO Encapsulation

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

In Go services, inconsistency in method signatures (e.g. mixing raw scalar parameters with structs, optional context arguments, or varying error returns) leads to confusing APIs, code duplication, and difficulty adding metadata (like tracing or context cancellation).

## Decision

Every domain service method must strictly follow the uniform signature pattern:
```go
func (s *Service) MethodName(ctx context.Context, req RequestStruct) (*ResponseStruct, error)
```

- **Mandatory `context.Context`**: Always passed as the first parameter for deadline propagation, cancellation signals, and context enrichment (tracing, logging).
- **Dedicated Request DTO Structs**: Inputs are encapsulated into explicit DTO structs (e.g., `user.RegisterRequest`, `url.CreateURLRequest`) rather than multiple positional parameters.
- **Dedicated Response Pointer/Struct**: Outputs return a pointer to a response struct or an explicit domain struct, alongside an `error`.

## Consequences

### Positive
- Predictable and homogeneous service interfaces across all modules.
- Refactoring and adding fields to DTOs does not break method signatures.
- Simplifies writing mocks, middleware wrappers, and decorator patterns.

### Negative
- Requires defining small DTO structs even for simple queries with 1 or 2 parameters.
