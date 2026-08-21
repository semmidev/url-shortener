# ADR infra-0004: PgBouncer Connection Pooling & `pgx/v5` Transaction-Pooling Compatibility

* Status: `Accepted`
* Date: 2026-08-21

## Context

PostgreSQL uses a process-per-connection model where each client connection consumes 2–10MB of RAM and CPU context-switching overhead. As the HTTP API and worker instances scale horizontally across $N$ replicas, direct PostgreSQL connection count can quickly saturate database server resources.

However, when using PgBouncer in high-concurrency **Transaction Pooling Mode (`pool_mode = transaction`)**, client connections are multiplexed per transaction. Because backend server sessions rotate between queries, standard server-side prepared statements (`PREPARE stmt`) used by Go drivers can cause statement non-existence errors (`SQLSTATE 26000`).

## Decision

We implemented a best-practice **PgBouncer** architecture with explicit `pgx/v5` driver compatibility controls:

1. **PgBouncer Configuration (`server/db/pgbouncer/pgbouncer.ini`)**:
   - Configured `pool_mode = transaction`.
   - Set optimal connection pool limits:
     - `max_client_conn = 1000`: Allows up to 1,000 client frontend & worker connections.
     - `default_pool_size = 20`: Shared backend PostgreSQL server connections.
     - `max_db_connections = 50`: Upper bound on direct PostgreSQL connections across all pools.
2. **Container Service (`url-shortener-pgbouncer`)**:
   - Added `pgbouncer` service in `compose.yml` listening on port `6432`.
3. **`pgx/v5` Statement Cache Disabling**:
   - In `server/internal/platform/postgres/postgres.go`, added `DisableStatementCache` / `StatementCacheCapacity` support.
   - When `DB_PGBOUNCER_ENABLED=true` or `DB_DISABLE_STATEMENT_CACHE=true`, `pgxpool` sets `DefaultQueryExecMode = pgx.QueryExecModeExec` and `StatementCacheCapacity = 0`, eliminating prepared statement collisions in transaction pooling mode.

4. **Credential Security & Git Safety**:
   - `server/db/pgbouncer/userlist.txt` is added to `.gitignore` so plain/MD5 credentials are never committed to version control.
   - `userlist.txt.example` is committed as a placeholder template for local development.
   - Containerized PgBouncer accepts `DB_USER` and `DB_PASSWORD` dynamically from `.env` environment variables or Secret Managers (GitHub Secrets, HashiCorp Vault, AWS Secrets Manager) at runtime.
   - For production setups, `auth_type = scram-sha-256` or `auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename=$1` is recommended to fetch credentials dynamically from PostgreSQL without storing static files.

## Consequences

- Hundreds of API and Worker instances can share 20–50 PostgreSQL backend connections without database RAM or CPU exhaustion.
- Zero prepared statement collisions or `SQLSTATE 26000` errors under transaction pooling.
- 100% credential security when committing code to Git (secrets remain strictly inside `.env` or Secret Managers).
- Easy toggling between direct PostgreSQL (port `5432`) and PgBouncer connection pooling (port `6432`).
