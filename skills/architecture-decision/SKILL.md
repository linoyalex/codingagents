---
name: architecture-decision
description: Produce Architecture Decision Records and ARCH-[feature].md documents
version: "1.0.0"
---

# Skill: Architecture Decision Records

## Decision Evaluation Framework

| Criterion | Questions to ask |
|-----------|-----------------|
| **Understandability** | Can a new engineer reason about this without a long explanation? |
| **Changeability** | How expensive is it to replace or modify this in 18 months? |
| **Operability** | Is it observable, debuggable, and deployable without heroics? |
| **Security posture** | Does it follow least privilege? What's the blast radius of a breach? |
| **Cost** | What is the compute, egress, and human-hours cost at 10x load? |

## ADR Template

```markdown
## ADR-[NUMBER]: [Short title]

**Status:** Proposed | Accepted | Deprecated
**Date:** YYYY-MM-DD

**Context:**
[What problem are we solving? What constraints exist?]

**Options Considered:**
1. [Option A] — Pros / Cons
2. [Option B] — Pros / Cons

**Decision:**
[What we chose and why.]

**Consequences:**
- Positive: ...
- Negative / Trade-offs: ...
- Follow-up actions: ...
```

## ARCH-[feature].md Template (keep under 100 lines)

```markdown
## Architecture: [Feature Name]
**ADR:** ADR-[N] | Date: YYYY-MM-DD

### Decision
[What approach, in 2–3 sentences]

### Data Model Changes
[New fields/tables only]

### API Contract
[Endpoint signatures only, no implementation]

### Module Boundaries
[Which module owns what, what it must NOT cross into]

### Failure Modes
[What happens when each external dependency fails]

### Rejected Alternatives
1. [Option] — rejected because [reason]
```

## Tech Stack Evaluation Criteria

Before approving any new dependency, evaluate against:
- **Maturity**: How long has it been maintained? Active contributors?
- **Bundle size**: What does it add to the client payload?
- **Security history**: Any published CVEs? How fast were they patched?
- **Alignment**: Does the existing stack already cover this need?
- **Escape hatch**: How hard is it to remove if we change our mind?

## Tech Radar Format

Maintain in `docs/tech-radar.md`:

| Technology | Ring | Last reviewed | Notes |
|-----------|------|---------------|-------|
| React 19 | Adopt | YYYY-MM-DD | Core framework |
| [Library] | Trial | YYYY-MM-DD | Evaluating for [use case] |
| [Library] | Hold | YYYY-MM-DD | Replaced by [alternative] |

Rings: **Adopt** (use freely) → **Trial** (use in non-critical paths) → **Assess** (research only) → **Hold** (do not use)

## System Design Checklist

- [ ] Service/module boundaries are explicit
- [ ] Data ownership is clear (one module owns each entity)
- [ ] No circular dependencies between layers
- [ ] Integration points documented (APIs, queues, shared state)
- [ ] Failure modes defined for every external dependency
- [ ] Rollback strategy documented
- [ ] Observability: logging and health checks from day one
