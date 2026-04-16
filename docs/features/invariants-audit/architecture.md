## Architecture: Invariants-Audit Skill for Cross-Layer Semantic Review
**Generated:** 2026-04-16T21:30:00Z
**ADR:** ADR-invariants-audit | Date: 2026-04-16
**Source PRD:** docs/features/invariants-audit/prd.md

### Decision

Add a reusable invariants-audit skill loaded conditionally by 4 existing commands
(review, architect, security-gate, test-design) and integrated into 4 Codex reviewer
prompts. The skill teaches a 5-step invariant analysis method and 5 review categories
for detecting cross-layer semantic mismatches. It is not a new pipeline phase or command.

### Decision Confidence

**Decision confidence:** high

Clear precedent: 4 existing skills follow the same progressive-disclosure pattern.
12 consumer files have established integration patterns (Skill References tables,
`## Apply when:` conditional sections). The installer already handles new skill
subdirectories via `cp -r`.

### Revisit When

**Revisit when:** more than 3 skills need Codex reviewer `## Section` integration,
suggesting the wiring test pattern should be generalized from feature-specific to
framework-level.

### Rollback / Fallback

**Rollback / Fallback:** Remove `skills/invariants-audit/` and its installed copy.
Remove the Skill References row from 4 commands and the `## Invariant Checks` section
from 4 Codex reviewers. Remove the contract test file. Consumers revert to standard
review methodology. No data model or schema changes to undo.

### Workflow

The skill activates conditionally within existing commands, not as a standalone workflow:

```
Reviewer runs /review (or /architect, /security-gate, /test-design)
    |
    +-- Command loads invariants-audit skill via Skill References table
    |
    +-- Agent checks "When to Use" trigger conditions
    |     (workflow logic, state transitions, safety checks, test architecture)
    |
    +-- Triggers match?
    |     YES: Apply 5-step invariant method alongside normal review
    |     NO:  Skip invariant analysis, normal review only
    |
    +-- Findings (if any) appear in the standard review artifact
```

For Codex reviewers: same logic via `## Invariant Checks` sections with
`**Apply when:**` triggers. No new Codex workflow.

### Module Boundaries

| Module | Owns | Must NOT cross into |
|--------|------|---------------------|
| `skills/invariants-audit/` | Methodology, categories, patterns, stop conditions | Command orchestration, reviewer identity, handoff schema |
| `commands/{review,architect,security-gate,test-design}.md` | Skill References table row, skill-loading instruction | Methodology content (defers to skill) |
| `codex/reviewers/review-{code,prd,architecture,test-design}.md` | `## Invariant Checks` section with trigger + checklist | Methodology authoring (derives from skill categories) |
| `tests/contracts/invariants-audit.test.js` | Wiring verification, structural anchors | Skill content validation (use heading anchors, not prose) |

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| Reviewer findings (AI-generated) | Each finding must cite evidence: file path, line, and cross-layer contradiction | Must not be treated as ground truth without verification |
| Trigger condition evaluation | Agent self-evaluates triggers; no runtime enforcement | Over-application to non-workflow changes wastes tokens |

### File Manifest

| File | Action | ACs | Est. lines |
|------|--------|-----|------------|
| `skills/invariants-audit/SKILL.md` | Create | AC1, AC3, AC7 | ~90 |
| `skills/invariants-audit/review-categories.md` | Create | AC1, AC2 | ~50 |
| `.claude/skills/invariants-audit/*` | Byte-copy of source | AC1a | -- |
| `commands/review.md` | Add Skill References row + loading instruction | AC4 | +3 |
| `commands/architect.md` | Add Skill References row + loading instruction | AC4 | +3 |
| `commands/security-gate.md` | Add Skill References row + loading instruction | AC4 | +3 |
| `commands/test-design.md` | Add Skill References row + loading instruction | AC4 | +3 |
| `codex/reviewers/review-code.md` | Append `## Invariant Checks` | AC5 | +12 |
| `codex/reviewers/review-prd.md` | Append `## Invariant Checks` | AC5 | +12 |
| `codex/reviewers/review-architecture.md` | Append `## Invariant Checks` | AC5 | +12 |
| `codex/reviewers/review-test-design.md` | Append `## Invariant Checks` | AC5 | +12 |
| `tests/node/command-skill-wiring.test.js` | Extend (Codex reviewer wiring, structural anchors) | AC5, AC6 | +40 |
| `tests/node/core-skill-contracts.test.js` | Extend (budget, anchors, sync) | AC1a, AC6 | +10 |

No changes to `init.sh` or `upgrade.sh` -- existing `cp -r skills/* .claude/skills/`
covers new subdirectories automatically.

### Skill File Structure

**SKILL.md (~90 lines, budget: 120)**

```
## Top Rules                          (~5 lines)
## Invariant Review Method            (~25 lines -- 5-step method, AC3)
## Review Categories                  (~5 lines summary + sibling link)
  [See reference: .claude/skills/invariants-audit/review-categories.md]
## When to Use                        (~15 lines -- trigger table, AC7)
---
**STOP CONDITIONS (end of file):**    (~5 lines)
```

**review-categories.md (~50 lines, boundary: ~80)**

Five categories (AC2) with signals and example patterns per category:
1. State-machine and transition bugs
2. Blocked / rejected / retry / stale-state paths
3. Spec vs implementation vs tests vs hooks contradictions
4. Fixture-template-validator mismatches
5. Tests that prove syntax or structure but not behavior

### Codex Reviewer Integration

Each reviewer gets a specialized `## Invariant Checks` section (~12 lines):

| Reviewer | `**Apply when:**` trigger | Checklist focus |
|----------|---------------------------|-----------------|
| review-code | diff touches workflow logic, state transitions, hooks, or test architecture | spec-vs-impl contradictions, fixture mismatches |
| review-prd | PRD covers state-machine behavior or multi-step workflows | blocked paths in ACs, AC-to-AC contradictions |
| review-architecture | architecture includes state machines or multi-phase pipelines | spec-vs-architecture contradictions, missing failure paths |
| review-test-design | tests verify workflow logic or pipeline behavior | syntax-not-behavior tests, missing transition coverage |

**Ownership note:** `codex/reviewers/` is Codex-owned per docs/CLAUDE.md file ownership
table. The `## Invariant Checks` sections are a cross-boundary integration. Precedent:
ISS-027 added Install-Path Tracing sections to `review-code.md` in the same pattern.

### Test Strategy

**Wiring contract suite** (`tests/node/command-skill-wiring.test.js`, extend):
Per PRD AC6, this is the single named suite for all wiring verification:
- Claude command wiring: each of 4 commands has `invariants-audit` in Skill References table
  (auto-discovered by existing dynamic checks)
- Codex reviewer wiring (new check type): each of 4 reviewers has `## Invariant Checks`
  section with `**Apply when:**` trigger line AND at least one checklist item (line starting
  with `- `) derived from the review categories (AC2)
- Structural anchors: SKILL.md has `## Invariant Review Method`, `## Review Categories`,
  `## When to Use` headings
- Sibling reference resolution: all `[See reference: ...]` links resolve to existing files
- Stop conditions footer present

**Core skill contracts** (`tests/node/core-skill-contracts.test.js`, extend):
- Line budget: `skills/invariants-audit/SKILL.md` <= 120 lines
- Byte-identity sync: source equals installed copy for SKILL.md and review-categories.md

**Existing tests** (no changes needed):
- `installer-coverage.test.js` -- auto-discovers new skill files under `skills/`

### Failure Modes

| Failure | Detection | Impact |
|---------|-----------|--------|
| Skill not loaded by command | Wiring contract test fails | Reviewer misses invariant analysis |
| `## Invariant Checks` missing from reviewer | Contract test fails | Codex reviewer skips invariant thinking |
| Installed copy stale or missing | Byte-identity sync test fails | Runtime skill load fails |
| Over-application to non-workflow changes | Mitigated by trigger conditions (AC7) | Token waste, no correctness impact |
| Sibling reference broken | Contract test checks link resolution | Reviewer gets partial methodology |

### Fitness Functions

1. **Wiring contract** -- all 8 declared consumers reference the skill (automated, CI)
2. **Structural anchors** -- required section headings survive refactoring (automated, CI)
3. **Line budget** -- SKILL.md stays under 120 lines (automated, CI)

### Rejected Alternatives

1. **New pipeline phase** -- rejected because the skill is a cross-cutting methodology,
   not a phase-specific gate. Adding a phase would double the review cost for every feature.
2. **Dedicated `system-auditor` role** -- rejected as premature. The PRD explicitly
   defers this until repeated use proves the need. The skill can be loaded by existing
   roles without creating a new identity.
3. **Identical `## Invariant Checks` across all reviewers** -- rejected because each
   reviewer type has different primary inputs and focus areas. Identical content would
   include irrelevant checks per reviewer, diluting signal.
4. **Multiple sibling files (one per category)** -- rejected because each would be only
   8-10 lines, below useful standalone size. The 5 categories are always applied as a set.
5. **Separate `tests/contracts/invariants-audit.test.js`** -- rejected because the PRD
   explicitly names `command-skill-wiring.test.js` as the wiring verification suite.
   Splitting wiring checks across two files creates ambiguity about where enforcement lives.
