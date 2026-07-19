# ADR-001: Engine boundaries in a modular monolith

## Decision

Keep one deployable backend initially. Content, Knowledge, Learning,
Assessment, Recommendation, AI, Policy, Presentation, and Intelligence are
logical engine boundaries, not deployable services.

Business logic has a single owner. Engines communicate through immutable
contracts, commands/queries, and past-tense events. No engine imports another
engine's implementation or repository.

## Consequences

The application layer may orchestrate a vertical slice. Engines can later be
extracted only when their operational load justifies it.
