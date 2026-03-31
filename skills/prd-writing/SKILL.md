---
name: prd-writing
description: Write Product Requirement Documents with user stories, acceptance criteria, and screen states
version: "1.0.0"
---

# Skill: PRD Writing

## User Story Format

```
As a [specific persona],
I want to [take this action],
So that [I achieve this outcome].
```

Rules:
- One story = one user value. Split stories that try to do two things.
- Stories must be completable in a single sprint (< 5 days of dev work).
- Stories must be independent — avoid stories blocked by others in the same sprint.

## Acceptance Criteria Format (Given/When/Then)

```
Given [a precondition or initial state],
When [the user performs an action],
Then [the system produces this observable outcome].
```

Each AC must be: **Specific** (unambiguous), **Testable** (automatable), **Measurable** (exact counts, states, or outcomes).

Every feature MUST include at least:
- One happy-path AC
- One error-state AC
- One empty-state AC

## RICE Prioritisation Framework

| Factor | Definition |
|--------|-----------|
| **Reach** | How many users affected per quarter? |
| **Impact** | How much does it move a key metric? (0.25 / 0.5 / 1 / 2 / 3) |
| **Confidence** | How certain are we? (%) |
| **Effort** | Person-weeks |

`Score = (Reach × Impact × Confidence) / Effort`

## Screen States Table (UX Designer contribution)

Every screen must define all five states:

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| [Name] | What shows when no data exists | Skeleton/spinner | Normal view | What the user sees on failure | Confirmation state |

Rules:
- Never use color alone to indicate status — always pair with text or icon
- Touch targets: minimum 44×44px
- Every screen must answer in 5 seconds: where am I, what can I do, what should I do next

## PRD Document Template (keep under 150 lines)

```markdown
## Feature: [Name]
**Phase:** Specify | Date: YYYY-MM-DD

### User Story
As a [persona], I want [action], so that [outcome].

### Acceptance Criteria
- [ ] Given..., When..., Then... (happy path)
- [ ] Given..., When..., Then... (error state)
- [ ] Given..., When..., Then... (empty state)

### Screen States
| Screen | Empty | Loading | Populated | Error |
|--------|-------|---------|-----------|-------|
| [Name] | ...   | ...     | ...       | ...   |

### Out of Scope
- [Explicit exclusions]

### Dependencies
- [Any blockers or prerequisites]

### RICE Score
Reach: | Impact: | Confidence: | Effort: | **Score:**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
```

## Story Validation Checklist

- [ ] Every AC is testable by a QA engineer
- [ ] Error and empty states are covered
- [ ] No solution-framing ("I want a dropdown") — only goal-framing ("I want to select my preference")
- [ ] Scope is clear — out-of-scope items are listed explicitly
- [ ] Story is independent and completable in one sprint
