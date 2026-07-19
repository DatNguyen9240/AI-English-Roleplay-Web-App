# Ownership Matrix

Architecture V1.0 is a modular monolith. An engine owns its records, its
business rules, and the contracts that it emits. Other engines may consume a
published command/query contract or an event, but may not read or mutate the
owner's repositories directly.

| Domain | Owner | Other engines may do | Other engines must not do |
| --- | --- | --- | --- |
| Content, activity versions | Content Engine | query published activity snapshots | mutate content/version records |
| Knowledge graph and learner state | Knowledge Engine | request `KnowledgeSnapshot`, submit `KnowledgeDelta` | calculate or write mastery/decay |
| Attempts, sessions, plans, SRS | Learning Engine | consume session/plan snapshots | apply knowledge state updates |
| Assessment results | Assessment Engine | consume immutable results | normalize assessment in a second place |
| Next-activity decisions | Recommendation Engine | consume `Decision` | select activities ad hoc |
| Rules, safety, experiments | Policy Engine | request `PolicyDecision` | duplicate policy checks |
| Insights and experiment evaluation | Intelligence Engine | consume events/insights | alter learning records directly |

## Contract ownership

| Contract | Owner |
| --- | --- |
| `AssessmentResult` | Assessment Engine |
| `KnowledgeDelta` | Learning Engine |
| `KnowledgeSnapshot` | Knowledge Engine |
| `RecommendationDecision` | Recommendation Engine |
| `LearningPlan` | Learning Engine |
| `PolicyDecision` | Policy Engine |
| `LearningInsight` | Intelligence Engine |

## Enforcement

The architecture check in `backend/scripts/check-architecture.js` blocks
engine-to-engine implementation imports. Cross-engine orchestration lives in
the application layer and uses public contracts only.
