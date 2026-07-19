# 10. Operations & Quality

## Performance contract

- Initial tutor visual/voice preparation must not block first useful screen.
- Text appears before first TTS playback.
- Chat render is throttled; 3D is lazy-loaded and bounded by device capability.
- Content, dictionary and static assets use appropriate cache boundaries.

## Reliability contract

- Idempotency for retryable turns.
- Transactional outbox for facts needing asynchronous delivery.
- No loss of active session after reconnect is the next acceptance target.
- Provider failure must degrade gracefully; realtime tutor is not brought down by learning persistence failure.

## Architecture tests

`npm run architecture:check --prefix backend` blocks engine-to-engine implementation imports. It is a starting guardrail, expanded as engines grow.

## Required observability

Every production turn should be traceable by request/session/learner correlation IDs. Minimum signals: STT latency, first LLM token, TTS latency, turn completion, assessment result, event publishing failure and client errors.

## Scale path

Start with one modular backend and PostgreSQL. Add Redis/session coordination, queue workers and object storage based on observed load. Do not introduce graph DB, microservices or ML recommendation without an RFC backed by a measured limitation.

## Definition of Done for a capability slice

- Functional end-to-end user flow.
- Immutable assessment and version references.
- Knowledge update and explainable recommendation.
- Idempotency, audit/outbox and failure behavior.
- Architecture dependency checks.
- Unit/smoke/E2E coverage proportional to risk.
