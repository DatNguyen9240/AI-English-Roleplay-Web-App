# AI Tutor

AI Tutor là nền tảng luyện tiếng Anh voice-first. Mục tiêu không phải chỉ tạo một cuộc trò chuyện với AI, mà biến mỗi lượt nói thành tiến độ học: assessment, retry, knowledge update và đề xuất bước tiếp theo.

## Bắt đầu đọc ở đây

Toàn bộ định hướng sản phẩm, feature, cách hoạt động và Architecture V1.0 đã được chuẩn hóa trong [docs/README.md](docs/README.md).

Đọc theo thứ tự:

1. [Product & Principles](docs/01-product-and-principles.md)
2. [User Experience & Flows](docs/02-user-experience.md)
3. [Capabilities & Content](docs/03-capabilities-and-content.md)
4. [Learning & Knowledge](docs/04-learning-and-knowledge.md)
5. [AI & Assessment](docs/05-ai-and-assessment.md)
6. [Architecture V1.0](docs/06-architecture-v1.md)
7. [Contracts, Data & Events](docs/07-contracts-data-and-events.md)
8. [Speaking Slice: Car](docs/08-speaking-slice-current-state.md)
9. [Roadmap](docs/09-roadmap.md)
10. [Operations & Quality](docs/10-operations-and-quality.md)
11. [Glossary](docs/11-glossary.md)

## Current implementation

The first vertical slice, **Speaking: Car**, is implemented and migrated to PostgreSQL:

```text
Transcript
→ AssessmentResult
→ KnowledgeDelta
→ UserKnowledge
→ RecommendationDecision
→ OutboxEvent
→ Practice Insight in the UI
```

It uses a rule-based assessment baseline while the AI assessment workflow, session resume and outbox publisher are the next priorities. See [08](docs/08-speaking-slice-current-state.md) for the exact boundary between implemented and planned work.

## Development

```powershell
# Database
docker compose up -d db

# Apply schema
$env:DATABASE_URL='postgresql://postgres:password123@localhost:5432/ai_roleplay?schema=public'
./backend/node_modules/.bin/prisma.cmd migrate dev --schema backend/prisma/schema.prisma

# Verify the first learning slice
$env:DATABASE_URL='postgresql://postgres:password123@localhost:5432/ai_roleplay?schema=public'
npm run smoke:speaking --prefix backend
```

The backend architecture guardrail is available through:

```powershell
npm run architecture:check --prefix backend
```
