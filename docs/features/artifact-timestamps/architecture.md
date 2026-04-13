## Architecture: Artifact Timestamps
**ADR:** ADR-002 | Date: 2026-04-12

### Decision
Add a `**Generated:** <ISO 8601>` metadata line to every pipeline-generated feature
artifact by updating the command instructions that produce them. No new code, hooks,
or schema changes — the timestamp is a convention enforced by command wording and
validated by a structural test.

### Decision Confidence
High — this is a documentation/convention change with no runtime components.

### Revisit When
- Artifacts adopt YAML front-matter (move timestamp into front-matter fields)
- Checkpoint hook gains artifact validation (could enforce timestamp presence)

### Rollback / Fallback
Remove the `**Generated:**` line from command instructions. Existing artifacts
with timestamps remain valid markdown — no cleanup needed.

### Data Model Changes
None. No schema, database, or handoff.json changes.

### Module Boundaries

| Owner | What changes |
|-------|-------------|
| `commands/specify.md` | Add timestamp instruction to PRD output rules |
| `commands/architect.md` | Add timestamp instruction to architecture.md output |
| `commands/security-gate.md` | Add timestamp instruction to security-audit.md output |
| `commands/review.md` | Add timestamp instruction to review.md output |
| `codex/reviewers/review-*.md` | Add timestamp instruction to Codex review output |
| `.claude/commands/*` | Mirror changes from source commands (byte-identity sync tests enforce this) |
| `docs/CLAUDE.md` | Document the convention in Code Conventions — single canonical source |
| `skills/prd-writing/SKILL.md` | Add `**Generated:**` line to PRD template |
| `skills/architecture-decision/SKILL.md` | Add `**Generated:**` line to architecture.md template |
| `skills/code-review/SKILL.md` | Add `**Generated:**` line to review document template |
| `skills/security-audit/SKILL.md` | Add `**Generated:**` line to audit template |

Commands own the instruction to include the timestamp. Skills own the template
that shows where it goes. `docs/CLAUDE.md` is the single canonical source for
the convention; skills and commands cross-reference it but do not redefine it.

`review-claude-*.md` files are produced by `commands/review.md` — no separate
owner needed. The same timestamp instruction covers both `review.md` and any
named Claude review file generated in the same phase.

### Timestamp Convention

Format: `**Generated:** 2026-04-12T14:30:00Z`
Placement: immediately after the document's top-level heading.
On regeneration: always use current time, never preserve the prior value.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Agent omits timestamp | Artifact lacks traceability | Structural test catches missing instruction in commands/skills |
| Agent copies stale timestamp | Misleading freshness signal | Command wording says "current ISO 8601 timestamp"; structural test verifies commands include "current" near the timestamp instruction. Regeneration freshness is agent-behavioral — static analysis cannot fully enforce it, but explicit wording + test coverage minimizes drift. |
| Installed commands drift from source | Timestamp instruction missing in installed copy | Existing byte-identity sync tests catch this |

### Fitness Functions
1. All four source commands (`commands/specify.md`, `commands/architect.md`, `commands/security-gate.md`, `commands/review.md`) reference the `**Generated:**` convention.
2. All Codex reviewer prompts (`codex/reviewers/review-*.md`) reference the `**Generated:**` convention.
3. Each artifact-producing skill template contains the `**Generated:**` anchor line.
4. `docs/CLAUDE.md` documents the timestamp convention in Code Conventions.
5. Installed `.claude/commands/*` stay in sync with source commands (covered by existing byte-identity sync tests — no new test needed for this).

### Rejected Alternatives
1. **YAML front-matter** — rejected because feature artifacts currently use plain
   markdown. Adding front-matter would be a larger convention change (ISS-013 territory).
2. **Hook-based validation** — rejected because it adds runtime complexity for a
   traceability improvement. Explicitly out of scope per PRD.
3. **Git-derived timestamps only** — rejected because git history requires tooling
   to read; an in-document timestamp is immediately visible.
