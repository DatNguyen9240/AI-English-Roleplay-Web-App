# 04. Learning & Knowledge Engine

## Knowledge-centric, not lesson-centric

Lesson chỉ là một cách đưa knowledge đến người học. Một node như `spill`, `past simple` hoặc `car vocabulary` có thể xuất hiện trong speaking, reading, listening và quiz.

```text
KnowledgeNode
→ KnowledgeNodeVersion
→ UserKnowledge
→ mastery / confidence / exposure / error / nextReviewAt
```

## UserKnowledge

`UserKnowledge` là state hiện tại của một learner với một node. Nó gồm mastery, confidence, exposure count, error count và thời gian review tiếp theo. Knowledge Engine là nơi duy nhất cập nhật state này.

## Learning Engine

Learning Engine nhận `AssessmentResult`, tạo `KnowledgeDelta`, quản lý attempt/session/SRS và learning plan. Nó không tự chấm bài và không tự tính mastery.

```text
Attempt
→ AssessmentResult
→ KnowledgeDelta
→ Knowledge Engine applies delta
→ updated snapshot
→ Recommendation
```

## Recommendation

### Online decision

Chọn next action rất nhanh: review due, weak node, goal match và repetition penalty. Kết quả là một `Decision`, không chỉ là activity ID.

### Offline plan

Sau này worker dùng insight, interest, schedule và retention pattern để chuẩn bị daily/weekly plan trước khi người dùng mở app.

## SRS

SRS là kết quả của knowledge state và learning plan, không phải một flashcard module độc lập. V1 đã lưu `nextReviewAt`; UI review đầy đủ là phase tiếp theo.
