# ADR-0018: Transactional Outbox Pattern & NATS JetStream Event Bus

* **Status**: Accepted
* **Date**: 2026-08-19

## Context

Synchronous analytics writing during HTTP redirection adds database write overhead to the critical path, degrading user redirect latency. However, writing to an external message bus without a transactional outbox risks dual-write inconsistency (database succeeds but event publishing fails or vice versa).

## Decision

We implemented the Transactional Outbox Pattern paired with NATS JetStream:
1. **Outbox Table (`000004_create_outbox_events.up.sql`)**:
   - Stores pending domain events atomically within the same database transaction.
2. **Pluggable Event Bus Interface (`platform/eventbus`)**:
   - Abstract `EventPublisher` contract allowing seamless transitions to Apache Kafka or RabbitMQ in the future without changing core service code.
   - NATS JetStream implementation (`NatsPublisher`) with automatic stream creation and manual message acknowledgement.
   - Fallback `InMemoryPublisher` if NATS is offline.
3. **Outbox Polling Worker (`platform/outbox`)**:
   - Background worker polls pending outbox events, publishes them to NATS JetStream, and marks entries as processed.
   - Asynchronous subscriber consumes `click.recorded` events and writes to `url_analytics`.

## Consequences

### Positive
- Removes analytics database write latency completely from the HTTP redirect path.
- Guarantees at-least-once event delivery (dual-write safety).
- Pluggable design enables easy migration to Kafka when scaling event-driven microservices.

### Negative
- Polling outbox table introduces minimal DB query overhead per tick interval.
