---
name: prd-writing
description: Write Product Requirement Documents with user stories, acceptance criteria, and screen states
version: "1.2.0"
---

# Skill: PRD Writing

## Top Rules

- Front-load the success signal: a downstream agent should know what "done" looks like without guessing.
- If the request is ambiguous, record the assumption or dependency explicitly instead of inventing hidden policy.
- Acceptance criteria must describe observable outcomes, not preferred implementation.
- Keep the PRD under 150 lines and focused on one user value.

## User Story Format

```text
As a [specific persona],
I want to [take this action],
So that [I achieve this outcome].
```

Rules:
- One story = one user value.
- Split stories that try to do two independent things.
- Keep the scope small enough for one sprint.

## Acceptance Criteria Format (Given/When/Then)

```text
Given [a precondition or initial state],
When [the user performs an action],
Then [the system produces this observable outcome].
```

Every feature must include:
- one happy-path AC
- one error-state AC
- one empty-state AC

Every AC should:
- be specific, testable, and measurable
- describe a user-visible or system-visible result
- name exact artifacts or state changes when downstream phases depend on them

## Screen States

Use this table for every important screen or workflow checkpoint:

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| [Name] | What shows when no data exists | Skeleton/spinner | Normal view | What the user sees on failure | Confirmation state |

Rules:
- Never use color alone to indicate status.
- Touch targets should be at least 44x44px.
- The user should know where they are, what they can do, and what to do next within 5 seconds.

## PRD Template

Include a `**Generated:**` timestamp line per the artifact timestamp convention in `CLAUDE.md`.

```markdown
## Feature: [Name]
**Generated:** <ISO 8601 timestamp>
**Phase:** Specify | Date: YYYY-MM-DD

### User Story
As a [persona], I want [action], so that [outcome].

### Acceptance Criteria
- [ ] Given..., When..., Then... (happy path)
- [ ] Given..., When..., Then... (error state)
- [ ] Given..., When..., Then... (empty state)

### Screen States
| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| [Name] | ...   | ...     | ...       | ...   | ... |

### Out of Scope
- [Explicit exclusions]

### Dependencies
- [Any blockers, assumptions, or prerequisites]

### RICE Score
Reach: | Impact: | Confidence: | Effort: | **Score:**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
```

## Validation Checklist

- [ ] Every AC is automatable by QA
- [ ] Error and empty states are covered
- [ ] No solution-framing unless implementation is itself the requirement
- [ ] Ambiguities are captured as assumptions or dependencies
- [ ] The PRD gives downstream phases enough detail to avoid improvising outputs

## Ticket Fidelity Procedure

When a ticket reference (ISS-NNN) is provided, follow this procedure before writing PRD ACs.
If no ticket reference is provided, skip this section.

**Step 1 — Read the ticket**
Read `docs/issues/tickets/ISS-NNN.md`. If the file is not found, do not silently skip fidelity.
Ask the user whether to proceed in degraded mode or stop. If the user approves degraded mode,
add a `**Degraded: ticket not found**` warning to the Dependencies section. Otherwise block.

**Step 2 — Transcribe ticket ACs**
Transcribe each ticket AC faithfully into Given/When/Then. Do not paraphrase or reinterpret.
Preserve the ticket's scope, severity, and specificity exactly.

**Step 3 — Flag divergences**
If a PRD AC diverges from the ticket AC in scope, severity, or specificity, flag it in
the Dependencies section as `**Assumption (diverges from ticket AC):**` with an explanation.

**Step 4 — Verify convention citations**
When citing a value from a project conventions file, read `docs/CLAUDE.md` and confirm
the value is present. If `docs/CLAUDE.md` is missing, use the root CLAUDE.md as fallback.
Never assume a convention value without reading the file.

**Step 5 — Contradiction check**
After all ACs are written, scan for pairs that make mutually exclusive claims.
If a contradiction is found, flag it in Dependencies before proceeding.

**Step 6 — Open-ended scope**
If the ticket uses open-ended language (e.g., "and any other relevant X"), enumerate the
concrete candidates OR ask the user which ones apply. Do not carry forward open-ended scope
into the PRD without resolution.
