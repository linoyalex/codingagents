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

Include a `**Generated:**` line with the current ISO 8601 timestamp immediately after the top-level heading.

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
