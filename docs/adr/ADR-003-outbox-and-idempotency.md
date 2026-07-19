# ADR-003: Transactional outbox and idempotent turns

## Decision

The Learning slice persists domain facts and `OutboxEvent` rows in the same
database transaction. Each turn has a unique idempotency key. Events are facts
such as `TurnCompleted`, `KnowledgeUpdated`, and `RecommendationCreated`; they
do not request work from another engine.

## Consequences

The first release records outbox rows for audit. A later worker can publish
them to Redis Streams, SQS, or another broker without changing the domain
contracts.
