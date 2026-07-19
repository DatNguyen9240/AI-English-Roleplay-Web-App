# 09. Delivery Roadmap

## Rule

Do not add many content modes before the current vertical slice meets its Definition of Done.

## Phase A - Complete Speaking Slice

1. Persist and resume session after reconnect.
2. Add assessment replay with superseding history.
3. Add minimal outbox publisher, structured logs and trace/correlation IDs.
4. E2E test: Car, wrong past tense, retry, updated state and recommendation.

## Phase B - Learning habit

1. User authentication/profile and goal setup.
2. Review queue and SRS UI.
3. Daily plan and continue-learning home.
4. Vocabulary notebook linked to KnowledgeNode.

## Phase C - Capability proof

1. Reading slice: content + quiz assessment.
2. Listening slice: audio + alignment/quiz assessment.
3. Writing slice: rubric-based AI assessment.

No new core contract unless one of these slices proves a gap.

## Phase D - Production platform

1. Redis for distributed session/cache/rate limit.
2. Queue/workers for speech, AI, outbox and plans.
3. Object storage for audio.
4. OpenTelemetry, metrics, dashboards and alerting.

## Phase E - Growth

CMS, content packs, experiments, subscription/billing, referral and deeper recommendation follow only after the learning loop has reliable data.
