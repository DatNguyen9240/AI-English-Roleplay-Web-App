# ADR-002: Immutable assessments and shared version references

## Decision

Assessment results are append-only. A corrected or replayed result creates a
new record and references the result it supersedes. Content, knowledge,
prompt, rubric, policy, and capability use the common `VersionRef` shape:

```text
{ id, type, version, createdAt }
```

## Consequences

Historical learning decisions remain explainable after changing a prompt,
rubric, or content. PII and audio are governed by retention rules; immutable
domain facts do not imply indefinite retention of raw personal data.
