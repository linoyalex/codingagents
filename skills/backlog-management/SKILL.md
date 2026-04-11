---
name: backlog-management
description: Issue backlog conventions — creating, updating, triaging, and closing issues across docs/issues/
version: "1.0.0"
---

# Skill: Backlog Management

## File Structure

```
docs/issues/
├── backlog.md          ← Index: one-line entries for open tickets (sorted by priority)
├── in-progress.md      ← Index: one-line entries for active tickets (includes branch name)
├── closed.md           ← Index: one-line entries with resolution summary
└── tickets/            ← Full ticket details, one file per ticket
    ├── ISS-001.md
    ├── ISS-002.md
    └── ...
```

**Key principle:** Full ticket content lives in `tickets/ISS-NNN.md` — never moved, never copied.
Moving a ticket through the lifecycle = delete one line from one index, add one line to another.
Any agent can read a ticket file for full context without loading all tickets.

## Index Formats

### backlog.md
```markdown
| ID | Priority | Type | Title |
|----|----------|------|-------|
| [ISS-NNN](tickets/ISS-NNN.md) | P2 — Medium | Bug | Short title |
```
Sorted by priority (P1 first), then by age (oldest first within same priority).

### in-progress.md
```markdown
| ID | Priority | Type | Title | Branch/Feature |
|----|----------|------|-------|----------------|
| [ISS-NNN](tickets/ISS-NNN.md) | P2 — Medium | Bug | Short title | `feature/branch-name` |
```

### closed.md
```markdown
| ID | Priority | Type | Title | Closed | Resolution |
|----|----------|------|-------|--------|------------|
| [ISS-NNN](tickets/ISS-NNN.md) | P2 — Medium | Bug | Short title | 2026-04-06 | Fixed in PR #123 |
```

## Ticket File Template

Create in `docs/issues/tickets/ISS-NNN.md`:

```markdown
# ISS-NNN: [Short descriptive title]

- **Type:** Bug | Feature | Architecture | Infrastructure
- **Priority:** P1 — High | P2 — Medium | P3 — Low
- **Label:** `label1`, `label2`
- **Created:** YYYY-MM-DD
- **Reporter:** [Agent name or Human]
- **Feature area:** [Module, file, or system area]

## Description
[What is the problem or need? Include file:line references where relevant.]

## Acceptance Criteria
- [Testable, specific outcomes that define "done"]

## Technical Analysis *(optional — add when root cause is known)*
[Root cause, affected code paths, type drift, wiring gaps, etc.]

## Notes
[Context, links to related issues, or implementation hints.]
```

## Status Transitions (how to move tickets)

### Open → In Progress
1. Remove the row from `backlog.md`
2. Add a row to `in-progress.md` with the `Branch/Feature` column filled in

### In Progress → Closed
1. Remove the row from `in-progress.md`
2. Add a row to `closed.md` with `Closed` date and `Resolution` summary

### In Progress → Backlog (deprioritised or blocked)
1. Remove from `in-progress.md`
2. Add back to `backlog.md` in priority order

### Any → Blocked
Add `(BLOCKED: reason)` suffix to the Title column in whichever index it's in.
Add a `## Blocked` section to the ticket file explaining the blocker.

**Token cost of a status change: ~2 lines edited across 2 index files. Ticket file untouched.**

## ID Assignment

```bash
# Find the next available ID across all indexes and ticket files
grep -rho 'ISS-[0-9]*' docs/issues/ | sort -t- -k2 -n | tail -1
```

Increment by 1. Never reuse IDs, even for closed issues.

## Creating a New Issue

1. Find the next ID (see above)
2. Create `docs/issues/tickets/ISS-NNN.md` using the ticket template
3. Add a row to `backlog.md` in priority order

## Type Definitions

| Type | When to use |
|------|-------------|
| **Bug** | Something that should work but doesn't |
| **Feature** | New capability that doesn't exist yet |
| **Architecture** | Structural issue — type drift, missing wiring, design gap |
| **Infrastructure** | Tooling, CI/CD, test infra, environment setup |

Compound types (e.g. `Bug + Architecture`) are allowed when a bug has a structural root cause.

## Priority Definitions

| Priority | SLA | Examples |
|----------|-----|---------|
| **P1 — High** | Current sprint | Core feature broken, security vulnerability, blocking dogfood |
| **P2 — Medium** | Next sprint | Quality issue, missing test coverage, usability friction |
| **P3 — Low** | Within 90 days | Polish, minor inconsistency, dev-only tooling issue |

## Label Registry

| Label | Scope |
|-------|-------|
| `framework` | Core framework structure, roles, skills, commands |
| `pipeline` | Phase flow, handoffs, hooks, verification gates |
| `review-quality` | Code review, security review, audit quality |
| `workflow` | State transitions, status, session discipline |
| `testing` | Test coverage, test infra, fixtures |
| `deployment` | init.sh, upgrade.sh, migrations, versioning |
| `documentation` | CLAUDE.md, PIPELINE_GUIDE, HOW_TO_USE, README |
| `dogfood` | Issues found or related to self-development |
| `security` | Auth, secrets, input validation |
| `infrastructure` | CI/CD, tooling, environment |

## When to File an Issue

All agents should file issues when they discover:
1. **Bugs found during review** — findings not fixed in the current branch
2. **Architecture gaps** — missing wiring, type drift, prompt contradictions
3. **Test coverage gaps** — missing integration tests, untested production paths
4. **Infrastructure problems** — broken CI, missing tooling, environment issues
5. **Quality issues** — inconsistencies, convention violations

Do NOT file issues for:
- Work already tracked in a feature's PRD acceptance criteria
- Findings fixed in the same commit/branch where they're found
- Speculative improvements with no concrete problem statement

## Triage Order

1. P1 issues first — always
2. P2 issues that block a current feature branch
3. P2 issues by age (oldest first within same priority)
4. P3 issues only when no P1/P2 work exists
