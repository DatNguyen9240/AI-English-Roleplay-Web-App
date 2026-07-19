# 03. Capabilities & Content Engine

## Capability trước, product pack sau

Core không biết IELTS, Kids hay Business là gì. Core chỉ biết capability và contract của capability.

| Capability | Input | Assessment | Output học tập |
| --- | --- | --- | --- |
| Speaking | voice/text | rule, AI hoặc human | fluency, grammar, pronunciation deltas |
| Reading | text | quiz/rule | comprehension and vocabulary deltas |
| Listening | audio | alignment/quiz | listening deltas |
| Writing | text | rubric/AI | structure and grammar deltas |
| ImageQuiz | image + choice | auto | vocabulary/concept deltas |

## Content Engine

```text
ContentBlock
→ versioned paragraph / audio / image / prompt material
→ Activity
→ KnowledgeNode links
→ render through a Capability
```

Reading, listening, roleplay, flashcard và quiz là các cách render activity khác nhau. Nội dung phải versioned để người học giữa một plan không bị đổi bài bất ngờ.

## Product packs

| Pack | Đăng ký |
| --- | --- |
| IELTS | speaking assessment, band rubric, cue card, essay, listening |
| TOEIC | timed quiz, listening, reading, score rubric |
| Business | roleplay, email, meeting, presentation |
| Kids | safe speaking, listening, image quiz, high-reward presentation policy |

Plugin đăng ký capability, content taxonomy, rubric và policy - không đăng ký màn hình riêng hoặc sửa core.

## CMS direction

CMS đến sau core loop. Editor tạo block, gắn knowledge, preview activity, version và publish. AI có thể hỗ trợ draft content nhưng con người/policy chịu trách nhiệm publish.
