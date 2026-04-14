## Architecture: Code Review Skill Hardening
**Generated:** 2026-04-14T16:30:00Z
**ADR:** ADR-inline | Date: 2026-04-14

### Decision

Extend the code-review skill with five new methodology steps (schema impact tracing, source/installed drift check, test suite execution, reproduction requirement, symmetric gate enforcement) using progressive disclosure — keeping SKILL.md under the 120-line prose budget with sibling reference files for detailed procedures. Contract tests use structural anchors (heading names, label patterns), not phrase-binding.

### Decision Confidence
high

### Revisit When
- The code-review skill grows beyond 3 sibling reference files (signals the skill is doing too much and should be split)
- A new gate command is added beyond `review.md` and `security-gate.md` (AC6 scope would need updating)

### Rollback / Fallback
All changes are additive sections in markdown files. Rollback = `git revert` the commit. No data model, runtime, or API changes are involved — the blast radius is limited to reviewer methodology and contract tests.

### Data Model Changes
None. This feature modifies only skill files, command files, and tests.

### API Contract
None. No runtime endpoints are affected.

### Module Boundaries

| Module | Owns | Must NOT cross into |
|--------|------|---------------------|
| `skills/code-review/SKILL.md` | Top-level methodology steps, finding classification, review rules, reviewer independence | Detailed step-by-step procedures (those go in sibling reference files) |
| `skills/code-review/impact-analysis.md` | Schema impact tracing procedure (AC1) | Implementation details of other checks |
| `skills/code-review/automated-checks.md` | Drift check (AC2), test suite execution (AC3) | Finding classification or severity rules |
| `skills/code-review/reproduction.md` | Reproduction requirement for BLOCKING/HIGH (AC4), escalation rules | Modifying severity definitions |
| `commands/review.md` | Gate orchestration, symmetric enforcement instruction (AC6) | Skill methodology details |
| `commands/security-gate.md` | Unchanged — AC6 verifies symmetric checks exist here, does not modify it |  |
| `tests/contracts/code-review-skill-hardening.test.js` | Structural anchor tests (AC5) | Phrase-binding assertions |

### File Change Plan

#### 1. `skills/code-review/SKILL.md` — Restructure to progressive disclosure

Current state: 152 lines, single file, no sibling references.

Changes:
- **Review Methodology** (existing § step 5 "Check integration"): Insert new step between 4 and 5: **"Trace downstream impact"** — one-line instruction linking to `[See reference: .claude/skills/code-review/impact-analysis.md]`. Covers AC1.
- **Quick Automated Checks** (existing §): Add two labeled entries:
  - `## Source/Installed Drift Check` — link to automated-checks.md. Covers AC2.
  - `## Test Suite Execution` — link to automated-checks.md. Covers AC3.
- **New § "Reproduction Requirement"** — after Finding Classification. One-paragraph rule with link to reproduction.md. Covers AC4.
- **New § "Symmetric Gate Enforcement"** — after Review Rules. Instruction: "When verifying a gate-phase check (e.g., `produced_by`, `source_spec`), confirm the same check exists in both `commands/review.md` and `commands/security-gate.md`." Covers AC6.
- Total SKILL.md target: ≤120 prose lines + links (within progressive disclosure budget).

#### 2. `skills/code-review/impact-analysis.md` — New sibling reference (AC1)

Contents:
- Heading: `## Schema Impact Tracing`
- Instruction: When the diff adds, removes, or renames a required field in any schema file (JSON Schema, TypeScript interface, Zod schema), grep for all producers and consumers of that schema. Verify each handles the change. List each producer/consumer pair with pass/fail.
- Stack-agnostic examples: `grep -r "handoff" --include="*.js" --include="*.ts"`, adapt to project stack.

#### 3. `skills/code-review/automated-checks.md` — New sibling reference (AC2, AC3)

Contents:
- Heading: `## Source/Installed Drift Check`
- Procedure: For each file in the diff matching `commands/`, `skills/`, or `hooks/`, compute the installed-copy path (mapping: `commands/*.md` → `.claude/commands/*.md`, `skills/<name>/<any>.md` → `.claude/skills/<name>/<any>.md` (covers SKILL.md and all sibling reference files), `hooks/*.js` → `.claude/helpers/*.js`). Run `diff <source> <installed>`. Flag any divergence as a HIGH finding.
- Empty state: If no touched files map to installable paths, skip with note.
- Error state: If mapping is ambiguous, note as unresolvable — do not block.

- Heading: `## Test Suite Execution`
- Procedure: Determine test command from project `CLAUDE.md` Commands section, `package.json` scripts, or equivalent. Run suites covering files touched by the diff. Report pass/fail.
- Empty state: If no test command found, note as a finding (not a silent skip).
- Error state: If test command fails to start, note as finding — do not block review.
- Nondeterministic: Re-run once on flaky failure; if still failing, note as finding.

#### 4. `skills/code-review/reproduction.md` — New sibling reference (AC4)

Contents:
- Heading: `## Reproduction Requirement`
- Rule: Before finalizing any BLOCKING or HIGH finding, reproduce it with actual commands. Document the reproduction command and output within the finding's existing `**Issue:**` field (this does not change the Review Document Template structure — it adds evidence content inside an existing field, not a new output-format contract).
- Cannot reproduce: Mark finding as "unverified — [reason]". May not assign BLOCKING severity to an unverified finding without escalating to the user.
- Nondeterministic: Mark "unverified — nondeterministic", downgrade from BLOCKING.
- Permission denied: Mark "unverified — environment constraint", escalate if BLOCKING.

#### 5. `commands/review.md` — Add symmetric gate instruction (AC6)

Add a `## Symmetric Gate Enforcement` section after "Separate Context Check":
- Instruction: When verifying any gate-phase check (e.g., `produced_by`, `source_spec`, `separate context`), confirm the identical check exists in both `commands/review.md` and `commands/security-gate.md`. If one gate has a check the other lacks, raise a HIGH finding.

#### 6. `tests/contracts/code-review-skill-hardening.test.js` — Structural anchor tests (AC5)

Test anchors (heading-level, not phrase-bound):
- AC1: SKILL.md contains heading or label matching `/impact|schema.*trac/i` and links to `impact-analysis.md`
- AC2: SKILL.md or linked file contains heading matching `/drift.*check|source.*installed/i`
- AC3: SKILL.md or linked file contains heading matching `/test.*suite.*execution/i`
- AC4: SKILL.md contains heading or label matching `/reproduction.*requirement/i`
- AC5: (meta) All above anchors are present — this IS the test
- AC6: SKILL.md contains heading or label matching `/symmetric.*gate|gate.*enforcement/i`
- Drift sync: Source `skills/code-review/SKILL.md` byte-equals installed `.claude/skills/code-review/SKILL.md`; same for each sibling reference file (`impact-analysis.md`, `automated-checks.md`, `reproduction.md`)
- Wiring: `commands/review.md` Skill References table includes `code-review` skill path
- AC6 command anchor: `commands/review.md` contains a heading matching `/symmetric.*gate|gate.*enforcement/i` (prevents the command from silently dropping the enforcement section while SKILL.md still references it)

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| Diff content (user-authored code) | Reviewer reads but never executes arbitrary diff content | Must not be piped to `eval` or shell expansion |
| Test suite output | Treated as diagnostic signal, not trusted verdicts | Must not auto-approve based solely on test pass |
| Reproduction commands | Reviewer-authored, not from diff | Must not execute commands suggested in PR description without inspection |

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Sibling reference file missing (deleted or not installed) | Reviewer skips the check silently | Contract test verifies file existence; drift sync test catches install gap |
| Test command not found in project config | Reviewer skips test execution | AC3 requires noting this as a finding, not silent skip |
| Drift check mapping is ambiguous | Reviewer cannot verify sync | Procedure says note as unresolvable, do not block |
| Reproduction environment lacks credentials | Finding stays unverified | AC4 escalation path: mark unverified, escalate if BLOCKING |

### Fitness Functions

1. **Skill size budget** — `skills/code-review/SKILL.md` ≤ 120 prose lines (progressive disclosure threshold). Measured by existing `skill-size-convention.test.js`.
2. **Structural anchor stability** — All 6 AC anchors survive rewording. Measured by `code-review-skill-hardening.test.js` using heading-level regex, not exact phrases.
3. **Source/installed sync** — All skill files (SKILL.md + sibling references) byte-equal their installed copies. Measured by drift sync assertions in the contract test.

### Rejected Alternatives

1. **Inline everything in SKILL.md** — rejected because the file is already at 152 lines; adding 5 sections inline would exceed the 250-line split threshold and violate the skill size budget convention.
2. **Create a separate skill (e.g., `skills/review-hardening/`)** — rejected because these are not independent procedures; they are extensions of the existing review methodology. A separate skill would require wiring changes in `commands/review.md` and split a cohesive concern across two skills.
3. **Modify `commands/security-gate.md` for AC6** — rejected because AC6 requires the *reviewer* to verify symmetry, not the security gate to add new checks. The enforcement is a review-time instruction, not a gate-time change. The PRD explicitly scopes changes to the code-review skill and its invoking command.
