# 08. Speaking Slice: Car - Current State

## Purpose

This is the first real vertical slice that proves the learning platform contract, using the existing Car topic.

## Implemented

```text
Topic Car
→ LearningSession
→ text or voice transcript
→ LearningTurn
→ AssessmentResult
→ KnowledgeDelta
→ UserKnowledge update
→ RecommendationDecision
→ OutboxEvent
→ learning-update UI feedback
```

### Database

The PostgreSQL migration `20260719074840_architecture_v1_speaking_slice` is applied. The schema includes sessions, turns, immutable assessments, knowledge nodes/versions, user knowledge, activities, decisions and outbox events.

### UI

The user sees a short Practice Insight after a turn: score, one focused improvement and a Try again action. It is deliberately separate from the streamed tutor answer to preserve responsiveness.

### Assessment baseline

The baseline is rule-based: response length, connected ideas and a simple past-tense signal. This creates normalized data without another LLM request.

### Safety

If learning persistence is unavailable during a deployment, the legacy realtime tutor still works. Learning failure is logged and does not fail the conversation.

## Verified

- Prisma migration status is up to date.
- Database smoke test creates and verifies session, assessment, knowledge, recommendation and three outbox events.
- Architecture dependency check passes.
- Shared contracts, frontend type check and production build pass.

## Not yet complete

- Reconnect/resume of an active learning session.
- Replay command for an assessment with a newer rubric/prompt.
- Outbox publisher worker and distributed queue.
- Full SRS review UI, auth and learner profile.
- AI-based assessment workflow/evaluation suite.
