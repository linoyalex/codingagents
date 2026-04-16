## Architecture: QA Test Quality Hardening
**Generated:** 2026-04-16T01:30:00Z
**ADR:** N/A (no new module; additive guidance to existing files) | Date: 2026-04-15

### Decision

Split the new QA test quality guidance into two locations following the established WHO/WHAT/HOW pattern:

1. **Command-side (WHAT):** Add three new instruction sections to `commands/test-design.md` — symmetric testing, adversarial contract testing, and artifact-type test strategy routing. These are read by the QA agent at Phase 3 invocation.

2. **Skill-side (HOW):** Add brief list entries (positions 8–9) to the "What to Test First" list in `SKILL.md` and link to a new sibling reference file `skills/tdd/test-quality-rules.md`. The sibling contains expanded guidance under structural headings (`## Symmetric Coverage`, `## Contract Robustness`, `## Structural vs Fixture-Driven Testing`, `## Artifact-Type Test Strategy`) plus the artifact-type-to-test-strategy table. `SKILL.md` stays focused on the core TDD cycle.

This follows the progressive disclosure pattern established by the code-review skill (ISS-039), which split into `SKILL.md` + three sibling reference files.

### Decision Confidence

**High.** The progressive disclosure pattern is proven (code-review skill, verification-gate skill). The TDD skill at 112 lines would exceed the 120-line prose budget if content were added inline. The split is the only option that stays within conventions.

### Revisit When

- The TDD skill is further refactored or merged with another skill
- The skill size convention changes (currently 120 prose / 250 total)
- A future ticket adds enough test quality rules that the sibling file itself needs splitting

### Rollback / Fallback

Low risk. If the sibling file approach causes agent confusion (agents don't follow the reference link), the content can be inlined back into `SKILL.md` with a documented skill size exception. No schema changes, no hook changes, no runtime dependencies.

### Files Changed

| File | Change type | What changes |
|------|------------|--------------|
| `commands/test-design.md` | Edit | Add `## Test Quality Rules` with 5 `###` subsections: Symmetric Testing, Behavioral Binding, Negative-Pattern Testing, Adversarial Contract Testing, Artifact-Type Test Strategy |
| `skills/tdd/SKILL.md` | Edit | Add `[See reference: ...]` link to sibling file; add 2 entries to "What to Test First" list (symmetric requirements, contract robustness) |
| `skills/tdd/test-quality-rules.md` | **New** | Sibling reference file for test *selection and strategy* rules. Contains: artifact-type-to-test-strategy table, expanded rule descriptions, stack-agnostic examples. **Purpose boundary:** covers which test pattern to use and which components to cover. Test execution procedures stay in SKILL.md. Split into focused siblings if file exceeds ~80 lines or gains off-purpose content. |
| `.claude/skills/tdd/SKILL.md` | Sync | Byte-identical copy of source |
| `.claude/skills/tdd/test-quality-rules.md` | Sync | Byte-identical copy of source |
| `.claude/commands/test-design.md` | Sync | Byte-identical copy of source |
| `tests/contracts/qa-test-quality.test.js` | **New** | Contract tests for all structural anchors |
| `tests/integration/qa-test-quality.integration.test.js` | **New** | Integration tests for cross-file wiring |

### Module Boundaries

| Module | Owns | Must NOT cross into |
|--------|------|-------------------|
| `commands/test-design.md` | Phase 3 invocation instructions — what the QA agent reads at session start | Must not contain reusable procedures (those belong in skills) |
| `skills/tdd/SKILL.md` | Core TDD cycle, commit protocol, test structure | Must not exceed 120 prose lines; extended guidance in sibling files |
| `skills/tdd/test-quality-rules.md` | Test quality rules: symmetric coverage, adversarial robustness, artifact-type routing | Must not duplicate content in the command; rules here are referenced by the command, not copied |

### Content Placement Rules

The PRD has 18 ACs across two target files. This mapping determines where each AC's content lands:

**In `commands/test-design.md`** (instructions the QA agent reads):
New `## Test Quality Rules` section with `###` subsections:
- AC1: `### Symmetric Testing` (when architecture enumerates components)
- AC4: `### Behavioral Binding`
- AC5: `### Negative-Pattern Testing`
- AC6: `### Adversarial Contract Testing`
- AC10: `### Artifact-Type Test Strategy` (3-way routing with hybrid precedence)

**In `skills/tdd/test-quality-rules.md`** (reusable reference loaded via `[See reference: ...]` from SKILL.md):
- `## Symmetric Coverage` heading — expanded guidance for AC2/AC3a (structural anchor for skill-side tests)
- `## Contract Robustness` heading — expanded guidance for AC7/AC8a (structural anchor for skill-side tests)
- `## Structural vs Fixture-Driven Testing` heading — AC9 distinction and guidance
- `## Artifact-Type Test Strategy` heading — AC11 table (3+ categories with rationale) and AC13 stack-agnostic examples (minimum 2 toolchains)

**In `skills/tdd/SKILL.md`** (minimal changes — stays under budget at ~116 lines):
- AC2: Append labeled entry at position 8 in "What to Test First": "`[symmetric-coverage]` Symmetric requirements across all enumerated components" (protected by label anchor: `[symmetric-coverage]`)
- AC7: Append labeled entry at position 9: "`[contract-robustness]` Contract robustness — can the safety invariant be trivially evaded?" (protected by label anchor: `[contract-robustness]`)
- AC14: Add `[See reference: .claude/skills/tdd/test-quality-rules.md]` link (contract-tested — structural bridge to sibling)

**In contract tests:**
- AC3, AC3a: Structural anchor tests for command-side and skill-side symmetric testing
- AC8, AC8a: Structural anchor tests for command-side and skill-side adversarial contract testing
- AC11a: Structural anchor test for artifact-type routing in skill
- AC14: Sibling discoverability link test
- AC14a: Skill size compliance test (3-way: sibling exists OR under budget OR exception documented)
- AC12: Existing test regression check

### Structural Anchors for Tests

Tests must use heading names and structural labels, not phrase content. Proposed anchors:

| AC | Anchor target | Anchor type | Anchor pattern |
|----|--------------|-------------|----------------|
| AC1/AC3 | `commands/test-design.md` | Heading | `### Symmetric Testing` under `## Test Quality Rules` |
| AC4 | `commands/test-design.md` | Heading | `### Behavioral Binding` under `## Test Quality Rules` |
| AC5 | `commands/test-design.md` | Heading | `### Negative-Pattern Testing` under `## Test Quality Rules` |
| AC6/AC8 | `commands/test-design.md` | Heading | `### Adversarial Contract Testing` under `## Test Quality Rules` |
| AC10 | `commands/test-design.md` | Heading | `### Artifact-Type Test Strategy` under `## Test Quality Rules` |
| AC2 | `skills/tdd/SKILL.md` | Label | `[symmetric-coverage]` in `## What to Test First` section |
| AC3a | `skills/tdd/test-quality-rules.md` | Heading | `## Symmetric Coverage` |
| AC7 | `skills/tdd/SKILL.md` | Label | `[contract-robustness]` in `## What to Test First` section |
| AC8a | `skills/tdd/test-quality-rules.md` | Heading | `## Contract Robustness` |
| AC9/AC11/AC11a | `skills/tdd/test-quality-rules.md` | Heading + table | `## Artifact-Type Test Strategy` + table with 3+ rows |
| AC14 | `skills/tdd/SKILL.md` | Pattern | `[See reference:` pointing to sibling |
| AC14a | Multiple | Composite | Sibling file exists OR SKILL.md ≤120 lines OR arch doc has "Skill Size Exception" heading |

**Anchor strategy:** All anchors are either headings or labels — both are structural markers that the convention explicitly permits. The `[symmetric-coverage]` and `[contract-robustness]` bracketed labels on list items serve the same role as template field labels: stable identifiers that the surrounding prose can change around without breaking tests. The SKILL.md list entries (AC2, AC7) and sibling headings (AC3a, AC8a) are independently protected. The `[See reference: ...]` link (AC14) is the structural bridge connecting the two.

### Sync Requirements

Per `docs/CLAUDE.md` convention, source and installed copies must be byte-identical:
- `skills/tdd/SKILL.md` ↔ `.claude/skills/tdd/SKILL.md`
- `skills/tdd/test-quality-rules.md` ↔ `.claude/skills/tdd/test-quality-rules.md`
- `commands/test-design.md` ↔ `.claude/commands/test-design.md`

Existing sync drift tests (from ISS-036) will automatically cover the new sibling file if it follows the same directory pattern.

### Trust Boundaries

Not applicable — this feature modifies agent-facing methodology documents, not runtime code that processes user input or external data.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Agent doesn't follow `[See reference: ...]` link | QA misses test quality rules, falls back to old behavior | AC14 contract test catches missing link; agent prompts include skill loading instructions |
| Sibling file drifts from installed copy | QA reads stale rules | Existing sync drift tests (ISS-036) catch byte-identity violations |
| New guidance conflicts with existing "Anti-Patterns" section in SKILL.md | Agent receives contradictory instructions | Implementation must review Anti-Patterns section and ensure consistency |

### Fitness Functions

1. **Skill size compliance:** `skills/tdd/SKILL.md` must stay ≤120 prose lines (or have a documented exception). Measured by contract test.
2. **Symmetric test coverage:** Every structural anchor that appears in the command must have a parallel anchor in the skill (or sibling). Measured by the AC3/AC3a and AC8/AC8a test pairs.
3. **Sync identity:** Source and installed copies byte-identical. Measured by existing sync drift tests.

### Rejected Alternatives

1. **Inline all content in SKILL.md** — rejected because the skill is at 112 lines and adding ~30 lines of new guidance would exceed the 120-line prose budget. Violates the convention without a compelling reason.

2. **Put all guidance in the command, nothing in the skill** — rejected because the "What to Test First" list is a reusable skill concept shared across features. Putting it only in the command means other commands that load the TDD skill won't benefit.

3. **Create a new top-level `skills/test-quality/` skill** — rejected per PRD out-of-scope. The test quality rules are an extension of the TDD skill's "What to Test First" concept, not an independent methodology. A sibling reference file within `skills/tdd/` is the right granularity.
