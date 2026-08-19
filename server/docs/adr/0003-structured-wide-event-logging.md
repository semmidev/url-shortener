# ADR-0003: Structured Wide Event Logging (`log/slog`)

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Traditional HTTP logging emits multiple unstructured log messages per request (e.g. request started, auth verified, DB queried, response sent). In high-volume systems, this leads to log floods, high storage costs, and difficult log line correlation.

## Decision

We implement **Wide Event Logging** using standard library `log/slog`:
- **Canonical Log Line (`WideEvent`)**: Per-request attributes (HTTP status, duration, IP, user ID, route, user agent) are accumulated in context during request execution and emitted as **exactly ONE canonical structured log line** upon request completion via `middleware.WideEventLogging`.
- **Zero Third-Party Logging Dependencies**: Built directly on `log/slog`.
- **Environment Configuration**: Configured via `LOG_LEVEL`, `LOG_FORMAT` (`json` or `text`), and `LOG_ADD_SOURCE`.

## Consequences

### Positive
- Drastically reduces log noise and log ingestion volume.
- Ensures all context attributes for an HTTP request reside in a single searchable JSON entry.
- Easy ingestion for log aggregation tools (Elasticsearch, Loki, Datadog).

### Negative
- Developers must attach attributes to the context `WideEvent` rather than calling `slog.Info()` directly throughout request processing.
