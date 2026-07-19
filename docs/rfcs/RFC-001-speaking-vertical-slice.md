# RFC-001: Speaking vertical slice (Car)

## Status

Accepted for implementation.

## Goal

Prove Architecture V1.0 with one complete, low-risk speaking flow. A learner
chooses **Car**, speaks or types a reply, receives a normalized assessment,
creates a knowledge update, and receives an explainable next action.

## In scope

1. A durable anonymous learner key, sent during the socket handshake.
2. `LearningSession`, `LearningTurn`, immutable `AssessmentResult`,
   `KnowledgeDelta`, `UserKnowledge`, `RecommendationDecision`, and
   `OutboxEvent` records.
3. Rule-based baseline speaking assessment. It proves the contract without
   adding a second LLM request to the latency-sensitive turn.
4. A `learning-update` socket event for the Presentation Engine.
5. Idempotency by turn request ID and append-only audit records.

## Non-goals

- Authentication, Redis, distributed socket state, and background publishing.
- A complete SRS UI or a CMS.
- Replacing the existing streamed tutor reply.

## Flow

```text
Transcript
  -> AssessmentResult (Assessment Engine)
  -> KnowledgeDelta (Learning Engine)
  -> UserKnowledge update (Knowledge Engine)
  -> RecommendationDecision (Recommendation Engine)
  -> Outbox facts + learning-update (Presentation boundary)
```

## Acceptance criteria

- The existing chat remains usable if the learning database migration has not
  yet been applied.
- Repeating a request ID does not create a second turn, assessment, delta, or
  event.
- Every decision contains version references and reason codes.
- The vertical slice never directly reads or writes another engine's table.
