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
| `.claude/commands/*` | Mirror changes from source commands |
| `docs/CLAUDE.md` | Document the convention in Code Conventions |
| `skills/prd-writing/SKILL.md` | Add `**Generated:**` line to PRD template |
| `skills/architecture-decision/SKILL.md` | Add `**Generated:**` line to architecture.md template |
| `skills/code-review/SKILL.md` | Add `**Generated:**` line to review document template |
| `skills/security-audit/SKILL.md` | Add `**Generated:**` line to audit template |

Commands own the instruction to include the timestamp. Skills own the template
that shows where it goes. Tests verify the structural anchor exists.

### Timestamp Convention

Format: `**Generated:** 2026-04-12T14:30:00Z`
Placement: immediately after the document's top-level heading.
On regeneration: always use current time, never preserve the prior value.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Agent omits timestamp | Artifact lacks traceability | Structural test catches missing instruction in commands/skills |
| Agent copies stale timestamp | Misleading freshness signal | Command wording says "current ISO 8601 timestamp" |
| Installed commands drift from source | Timestamp instruction missing in installed copy | Existing byte-identity sync tests catch this |

### Fitness Functions
1. `grep -l "Generated:" commands/specify.md commands/architect.md commands/security-gate.md commands/review.md` — all four commands reference the timestamp convention.
2. Structural test: each artifact-producing skill template contains the `**Generated:**` anchor line.

### Rejected Alternatives
1. **YAML front-matter** — rejected because feature artifacts currently use plain
   markdown. Adding front-matter would be a larger convention change (ISS-013 territory).
2. **Hook-based validation** — rejected because it adds runtime complexity for a
   traceability improvement. Explicitly out of scope per PRD.
3. **Git-derived timestamps only** — rejected because git history requires tooling
   to read; an in-document timestamp is immediately visible.
