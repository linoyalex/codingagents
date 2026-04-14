# Architecture: Implement Known-Risks Verification
**Generated:** 2026-04-13T17:45:00Z
**ADR:** ADR-002 | Date: 2026-04-13

## Decision

Add prose instructions to two existing files (`commands/implement.md` and `skills/tdd/SKILL.md`) so that the Phase 5 developer is explicitly told to read and act on `known_risks` from `.claude/handoff.json` during the GREEN phase. Verify the instructions exist via a structural-anchor contract test. No schema changes, no new tooling, no automated enforcement.

## Decision Confidence
High — the change is two prose additions and one test. The files, patterns, and test infrastructure all exist.

## Revisit When
- The pipeline gains automated enforcement of `known_risks` (commit-blocking or CI gate)
- `known_risks` moves out of `handoff.json` into a separate artifact
- A new handoff field supersedes `known_risks`

## Rollback / Fallback
Revert the two prose additions and remove the contract test. No data migration, no schema change, no runtime impact. The pipeline returns to its prior state where `known_risks` is carried but not explicitly surfaced during Phase 5.

## Files Changed

| File | Change | Owner |
|------|--------|-------|
| `commands/implement.md` (source) | Add `known_risks` instruction in GREEN step | developer command |
| `.claude/commands/implement.md` (installed) | Byte-identical copy of source | init.sh mirror |
| `skills/tdd/SKILL.md` (source) | Add checklist item in GREEN subsection | tdd skill |
| `.claude/skills/tdd/SKILL.md` (installed) | Byte-identical copy of source | init.sh mirror |
| `tests/node/core-skill-contracts.test.js` | Add contract test for both anchors | test suite |

No new files are created. No files are deleted.

## Module Boundaries

### commands/implement.md
- **Owns:** Phase 5 orchestration — what to read, what order to follow, what to commit
- **Change:** Insert a `known_risks` instruction inside the existing "Step 2 GREEN" block, after the "Write minimum code" line and before the "Run tests" line
- **Must NOT:** Add enforcement logic, reference test file contents, or duplicate TDD skill content

### skills/tdd/SKILL.md
- **Owns:** TDD cycle procedure — RED/GREEN/REFACTOR checklists and anti-patterns
- **Change:** Add a checklist-style item under the GREEN phase guidance. Place it in the "TDD Cycle" section, as a note after the GREEN line, or as a new bullet under "Top Rules" — the exact wording is flexible as long as the structural anchor (`known_risks` substring under a GREEN-related heading) is present
- **Must NOT:** Exceed the 120-line budget enforced by `core-skill-contracts.test.js`
- **Current line count:** 106 lines. Budget: 120 lines. Headroom: 14 lines. The addition should be 1-2 lines.

### tests/node/core-skill-contracts.test.js
- **Owns:** Structural-anchor contract tests for skills and commands
- **Change:** Add a new `test()` block that:
  1. Reads `commands/implement.md` and asserts a `known_risks` substring exists under a GREEN-related structural anchor
  2. Reads `skills/tdd/SKILL.md` and asserts a `known_risks` substring exists
- **Anchoring strategy:** Use heading-level regex (e.g., `/GREEN/` context) combined with `known_risks` substring match. Do NOT phrase-bind to exact sentences — this follows the ISS-010 structural anchor convention.

### Source/installed sync
The existing byte-identity test in `core-skill-contracts.test.js` (`committed .claude copies stay byte-identical`) already covers both `commands/implement.md` and `skills/tdd/SKILL.md`. After editing the source files, the installed copies must be updated to match. No new sync test entries needed.

## Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| `known_risks` array from `handoff.json` | Schema enforces array type; `resolve-feature.js` catches malformed JSON | Must not be interpolated into shell commands or used as file paths — it is prose for human reading only |

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Prose instruction is removed in future edit | Developer stops seeing `known_risks` guidance | Contract test fails in CI, blocking merge |
| `known_risks` field absent from handoff | No impact — instruction says "if present" | AC4 covers this; instruction is no-op when field is missing |
| TDD skill exceeds 120-line budget | `core-skill-contracts.test.js` budget test fails | Keep addition to 1-2 lines; refactor existing prose if needed |
| Source/installed copy drift | Byte-identity test fails | Update both copies in same commit |
| `resolve-feature.js` parse error on malformed JSON | Phase 5 halts before developer reaches GREEN | Pre-existing guard; AC5 confirms it still works |

## Fitness Functions

1. **Contract test passes:** `node --test tests/node/core-skill-contracts.test.js` — verifies both `known_risks` structural anchors exist
2. **Line budget holds:** TDD skill stays under 120 lines (existing budget test)
3. **Byte-identity holds:** Source and installed copies match (existing sync test)

## Rejected Alternatives

1. **Add a new hook to surface `known_risks` automatically** — Rejected because the PRD explicitly scopes to prose guidance only. A hook would introduce runtime behavior and require new error handling, expanding scope significantly.
2. **Add `known_risks` instruction to the RED phase instead of GREEN** — Rejected because risks relate to implementation correctness, not test design. The developer should verify risks after writing code, not before writing tests.
3. **Create a separate `known-risks.md` skill file** — Rejected because the instruction is 1-2 lines in each file. A separate skill would add a file, a skill load instruction, and a sync test entry for negligible value.
