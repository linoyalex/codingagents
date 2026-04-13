---
name: architecture-decision
description: Produce Architecture Decision Records and feature architecture documents
version: "1.2.0"
---

# Skill: Architecture Decision Records

## Top Rules

- Make one primary architectural decision easier to implement and review.
- Put revisit triggers and rollback or fallback behavior next to the decision.
- Document trust boundaries for any user- or AI-generated input that crosses system boundaries.
- Prefer at most three fitness functions in a feature architecture doc.
- If the feature still contains multiple unresolved decisions, split them instead of forcing one large document.

## Decision Evaluation Framework

| Criterion | Question |
|-----------|----------|
| Understandability | Can a new engineer reason about this quickly? |
| Changeability | How expensive is replacement in 12-18 months? |
| Operability | Is it observable and debuggable without heroics? |
| Security posture | What is the blast radius if this fails or is abused? |
| Cost | What changes at 10x load or team size? |

## ADR Template

Include a `**Generated:**` line with the current ISO 8601 timestamp immediately after the top-level heading.

```markdown
## ADR-[NUMBER]: [Short title]
**Generated:** <ISO 8601 timestamp>

**Status:** Proposed | Accepted | Deprecated
**Date:** YYYY-MM-DD
**Decision confidence:** high | medium | low
**Superseded by:** ADR-[N] | N/A
**Revisit when:** [specific trigger]
**Rollback / Fallback:** [how to recover if this decision fails]

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

## architecture.md Template

Include a `**Generated:**` line with the current ISO 8601 timestamp immediately after the top-level heading.

```markdown
## Architecture: [Feature Name]
**Generated:** <ISO 8601 timestamp>
**ADR:** ADR-[N] | Date: YYYY-MM-DD

### Decision
[What approach, in 2-3 sentences]

### Decision Confidence
[high | medium | low]

### Revisit When
[specific trigger that would change this decision]

### Rollback / Fallback
[how the team backs out or recovers if this design fails]

### Data Model Changes
[New fields/tables only]

### API Contract
[Endpoint signatures only, no implementation]

### Module Boundaries
[Which module owns what, what it must NOT cross into]

### Trust Boundaries
| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| [user or AI field] | [rule] | [where it must never go] |

### Failure Modes
[What happens when each external dependency fails]

### Fitness Functions
1. [highest-value architectural check]

### Rejected Alternatives
1. [Option] — rejected because [reason]
```

## Dependency Gate

Before approving any new dependency, evaluate:
- Need: what exact gap does it close?
- Existing alternative: can the current stack solve this already?
- Removal cost: how hard is it to back out later?
- Security posture: known CVEs, risky defaults, or supply-chain concerns?
- Operational impact: what does it add to debugging, deploys, or runtime complexity?

## Final Checklist

- [ ] Boundaries and ownership are explicit
- [ ] Failure modes are documented
- [ ] Revisit trigger and rollback are documented
- [ ] Trust boundaries are documented where relevant
- [ ] Fitness functions cover only the highest-value constraints
