# 07. Contracts, Data & Events

## Core contracts

| Contract | Owner | Purpose |
| --- | --- | --- |
| `Capability` | Content | defines activity input/output contract |
| `AssessmentResult` | Assessment | immutable normalized evaluation |
| `KnowledgeDelta` | Learning | requested change after an attempt |
| `KnowledgeSnapshot` | Knowledge | current learner state for a node |
| `RecommendationDecision` | Recommendation | explainable next action |
| `LearningPlan` | Learning | daily/weekly activity plan |
| `PolicyDecision` | Policy | resolved rules for current context |
| `LearningInsight` | Intelligence | aggregated meaningful observation |

## LearningContext

Every command has a small immutable context: actor/learner, locale, timezone, capability, policy snapshot, experiment flags, subscription and optional session reference. It is not a place for database clients, mutable state or secrets.

## VersionRef

Content, knowledge, capability, rubric, prompt and policy use the same audit shape:

```text
VersionRef { id, type, version, createdAt }
```

Assessments pin the relevant refs. A replay creates a new assessment; it does not overwrite history.

## Events and outbox

`TurnCompleted`, `KnowledgeUpdated` and `RecommendationCreated` are written with the domain transaction to `OutboxEvent`. A future worker publishes unpublished events to a real broker. Consumers react independently.

## Idempotency

Every turn has a unique idempotency key. Retrying the same key must not create duplicate turn, assessment, delta, decision or outbox events.

## Audit and explainability

`Decision` includes outcome, reason codes, confidence, input references, policy/experiment references and versions. This makes recommendation and assessment debuggable without storing unnecessary duplicate PII.
