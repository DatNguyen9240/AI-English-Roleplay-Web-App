# 05. AI & Assessment Engine

## AI is a provider, not the core

AI không sở hữu learning state. AI Engine nhận workflow, prompt version, policy và schema; sau đó trả dữ liệu hợp lệ cho Assessment Engine hoặc tutor presentation.

```text
Workflow
→ prompt + model router + policy
→ JSON schema validator
→ AssessmentResult or tutor response
```

## Assessment Engine

Mọi hình thức chấm phải chuẩn hóa thành `AssessmentResult`:

- speaking: rule baseline, LLM, pronunciation model hoặc human review;
- quiz: auto score;
- reading: rule/quiz;
- listening: speech alignment/quiz;
- writing: rubric + LLM.

Learning Engine chỉ tiêu thụ kết quả chuẩn hóa, không quan tâm provider nào tạo ra nó.

## Structured output

Không parse tag kiểu `<feedback>`. Assessment/tutor workflows phải trả JSON có schema, feedback ưu tiên, retry prompt, reason codes và version references.

## Current baseline

Speaking Slice đang dùng rule-based assessment để không cộng thêm LLM latency vào lượt nói. Nó kiểm tra độ dài, connected idea và lỗi quá khứ cơ bản. Đây là baseline có chủ đích; AI assessment được thêm sau khi replay/evaluation workflow sẵn sàng.

## Guardrails

Policy Engine cung cấp kid-safe topics, level/difficulty, rubric policy, experiment flags và subscription capability. Prompt, recommendation và presentation cùng đọc policy snapshot thay vì tự suy đoán.
