# AI Tutor Documentation

Đây là nguồn tài liệu chính để hiểu sản phẩm, cách học vận hành và kế hoạch xây dựng. Các file được đọc theo thứ tự số; README ở root chỉ là điểm vào ngắn gọn.

| # | Tài liệu | Trả lời câu hỏi |
| --- | --- | --- |
| 01 | [Product & principles](01-product-and-principles.md) | App này giúp ai và hứa hẹn điều gì? |
| 02 | [User experience](02-user-experience.md) | Người dùng đi qua app như thế nào? |
| 03 | [Capabilities & content](03-capabilities-and-content.md) | TOEIC/IELTS/Kids/Business mở rộng ra sao? |
| 04 | [Learning & knowledge](04-learning-and-knowledge.md) | App biết người học đã biết gì bằng cách nào? |
| 05 | [AI & assessment](05-ai-and-assessment.md) | AI làm gì, và không làm gì? |
| 06 | [Architecture V1](06-architecture-v1.md) | Các engine phối hợp ra sao? |
| 07 | [Contracts, data & events](07-contracts-data-and-events.md) | Dữ liệu, event và audit hoạt động thế nào? |
| 08 | [Speaking Slice: Car](08-speaking-slice-current-state.md) | Những gì đã chạy thật hôm nay? |
| 09 | [Roadmap](09-roadmap.md) | Làm gì tiếp theo, theo thứ tự nào? |
| 10 | [Operations & quality](10-operations-and-quality.md) | Hiệu năng, reliability, test và scale? |
| 11 | [Glossary](11-glossary.md) | Các thuật ngữ chung nghĩa là gì? |

## Decision records

- [Ownership matrix](architecture/ownership-matrix.md)
- [RFC-001: Speaking vertical slice](rfcs/RFC-001-speaking-vertical-slice.md)
- [ADR-001: Engine boundaries](adr/ADR-001-engine-boundaries.md)
- [ADR-002: Immutable assessments](adr/ADR-002-immutable-assessment-and-versioning.md)
- [ADR-003: Outbox & idempotency](adr/ADR-003-outbox-and-idempotency.md)

## Source of truth

- Product intent and future scope: files `01` to `05`.
- Architecture rules and contracts: files `06` and `07`, plus ADRs.
- What is implemented versus planned: file `08`.
- Delivery priority: file `09`.
