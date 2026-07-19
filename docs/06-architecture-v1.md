# 06. Architecture V1.0

## Decision

Architecture V1.0 là modular monolith với engine boundaries rõ ràng. Các engine là ranh giới ownership, chưa phải microservice.

```text
Presentation
  → Recommendation
    → Learning
      → Assessment / Knowledge / Content
          → AI + Policy
            → Intelligence
────────────────────────────────────────
Domain Contracts + Event Bus + Outbox
────────────────────────────────────────
PostgreSQL + Redis (later) + Object Storage + Queue (later)
```

## Engine responsibilities

| Engine | Owns |
| --- | --- |
| Content | blocks, activities, versions, publish |
| Knowledge | graph, snapshots, mastery, confidence, decay |
| Learning | sessions, attempts, deltas, SRS, plans |
| Assessment | normalized assessment results |
| AI | workflow registry, model routing, validation, eval |
| Recommendation | next activity and longer-term plan decisions |
| Presentation | UI runtime and accessible delivery |
| Policy | segment, safety, feature and experiment rules |
| Intelligence | insight, cohort, retention and experiment evaluation |

## Non-negotiable laws

1. Business logic exists in one owner only.
2. An engine does not read/write another engine's database implementation.
3. Cross-boundary communication uses immutable contracts, commands/queries or past-tense events.
4. Event Bus announces facts; it does not hide synchronous business logic.
5. Application layer may orchestrate a vertical slice but owns no domain rule.

## Why modular monolith first

It keeps deployment, debugging and iteration fast while dependency boundaries are enforced in CI. Extraction happens only when independent load, ownership or release cadence makes it necessary.
