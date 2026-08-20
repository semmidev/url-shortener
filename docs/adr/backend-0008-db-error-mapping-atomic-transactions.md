# ADR-0008: Database Error Mapping & Atomic Transactions

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Raw PostgreSQL error codes (`23505`, `23503`) or `pgx.ErrNoRows` coming from SQL queries leak database specifics into the business layer. Additionally, multi-query business operations require strict transaction boundaries to ensure atomicity.

## Decision

1. **Centralized Error Mapping (`apperr.MapDBError`)**: Low-level database driver errors are mapped directly to domain error objects:
   - `pgx.ErrNoRows` $\rightarrow$ `apperr.NotFound(...)`
   - Postgres `23505` (`unique_violation`) $\rightarrow$ `apperr.Conflict(...)`
   - Postgres `23503` (`foreign_key_violation`) $\rightarrow$ `apperr.Invalid(...)`
2. **Atomic Transaction Helper (`SQLStore.ExecTx`)**: Multi-statement database updates execute inside atomic transaction callbacks (`s.store.ExecTx`), automatically handling `BEGIN`, `COMMIT`, and `ROLLBACK` on error.

## Consequences

### Positive
- Business services remain completely decoupled from SQL driver implementation details.
- Guarantees data consistency across multi-step database mutations.

### Negative
- All database operations must pass error values through `apperr.MapDBError`.
