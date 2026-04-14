## Code Review: feature/ISS-036-wiring-verification
**Generated:** 2026-04-13T17:30:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase** | Reviewer identity: code-reviewer (handoff produced_by: developer)
**Diff:** `git diff main...HEAD`

---

### Summary

The wiring-verification feature adds a clean 4-stage library (`lib/wiring-check.js`) with
44 tests across unit/contract/integration/E2E layers, all passing. The library correctly
implements discovery (Stage 1), registry parsing (Stage 2), wiring checks (Stage 3), and
negative fixture validation (Stage 4). The F1 fix (`exists()` guard in
`checkCommandSkillWiring`) and F4 fix (depth-aware `extractSection`) are both correct. One
convention violation remains: two E2E tests scan a JavaScript test file's source text for
phrase-match assertions, directly violating the `docs/CLAUDE.md` prohibition on phrase-binding.

---

### Verdict: REQUEST_CHANGES

One BLOCKING convention violation. Two non-blocking suggestions. One praise.

---

### Findings

#### issue (BLOCKING): E2E tests use phrase-binding on JavaScript source text

**File:** `tests/integration/wiring-verification-e2e-chain.integration.test.js:87-104, 180-182`

Two test blocks read `tests/node/command-skill-wiring.test.js` as a string and grep for
implementation markers:

```
assert.match(wiringTest, /Skill References/)       // line 90
assert.match(wiringTest, /Required Artifacts/)     // line 94
assert.match(wiringTest, /Output|Deliverables/)    // line 98
assert.match(wiringTest, /fixture|wiring.gap/i)    // line 102
assert.match(wiringTest, /assert\.throws|assert\.rejects/) // line 181
```

`docs/CLAUDE.md` explicitly prohibits this: "Tests for skills/commands must use structural
anchors (heading names, template field labels), not phrase-binding. Phrase-bound tests punish
refinement and prevent wording improvements." Scanning a JavaScript file for string literals
is the most brittle form of phrase-binding: renaming a variable, extracting a helper, or
changing a comment breaks the test without any behavior change.

The intent at lines 82-104 (verifying the test covers all 4 stages) is valid, but the
mechanism is wrong. Replace with behavioral assertions:

```js
// Import library and verify all 4 stages are exercisable
const {
  parseSkillReferences,
  parseRequiredArtifacts,
  checkArtifactWiring,
  checkCommandSkillWiring,
} = require('../../lib/wiring-check');
assert.equal(typeof parseSkillReferences, 'function', 'Stage 1 export');
assert.equal(typeof parseRequiredArtifacts, 'function', 'Stage 2 export');
assert.equal(typeof checkArtifactWiring, 'function', 'Stage 3 export');
assert.ok(exists('tests/fixtures/wiring-gap/mock-skill.md'), 'Stage 4 fixture');
```

For lines 180-182 (asserting `assert.throws` appears in source), the negative fixture
already has its own behavioral test (`AC11 (behavioral)`) that calls the function and
asserts it throws -- that test is the structural anchor; the source-grep is redundant.

---

#### suggestion (MEDIUM): AC4 and AC5 contract tests are structurally shallow

**File:** `tests/contracts/wiring-verification.test.js:113-131`

The AC4 and AC5 tests use `assert.match` against command text with broad patterns like
`/artifact/i` and `/output/i`. These pass on any document containing those words. The
behavioral test is stronger: `checkCommandSkillWiring` already runs against `implement.md`
and `test-design.md` in the unit tests (Stage 3 AC1/AC4). The shallow structural tests
add noise but don't mask a real gap -- not blocking.

---

#### suggestion (LOW): No sync test for command source/installed copies

**File:** All command files in diff

Both `commands/*.md` and `.claude/commands/*.md` receive identical `## Skill References`
additions. The E2E test asserts byte-identity for `skills/tdd/SKILL.md` vs
`.claude/skills/tdd/SKILL.md`, but no parallel test covers command copies. If one is
edited without the other, the wiring check (reading `commands/`) diverges from what agents
load (`.claude/commands/`). The ISS-009 sync pattern should extend to commands.

---

#### praise: F1 fix is clean and consistent

**File:** `lib/wiring-check.js:239-243`

The `exists()` guard in `checkCommandSkillWiring` throws a named error with command name,
skill name, and file path -- matching the error quality throughout the library. No raw
ENOENT escapes any public function. The dedicated F1 test exercises the error path
correctly.

---

### Test Assessment

- [x] New code has corresponding tests -- 44 tests across unit, contract, integration, E2E
- [x] Edge cases covered -- conditional artifacts (AC8), multi-path (AC9), empty skill (AC7), malformed table (AC3), missing Output section, fail-closed heuristic
- [x] No skipped tests introduced -- `result.skipped` references are value assertions
- [ ] Tests are testing behavior, not implementation -- **fails**: E2E reads JS source text and phrase-matches (BLOCKING)

---

### Convention Compliance

- [x] Follows project folder structure (`lib/`, `tests/node/`, `tests/contracts/`, `tests/fixtures/`, `tests/integration/`)
- [x] Naming conventions respected -- kebab-case fixtures, camelCase functions
- [x] No `any` types (JavaScript project -- N/A)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format (feat:, test:, chore:)
- [ ] No phrase-binding tests -- **fails**: `wiring-verification-e2e-chain.integration.test.js` lines 90-102, 181

---

### AC Coverage

| AC | Status | Evidence |
|----|--------|---------|
| AC1 | PASS | `checkCommandSkillWiring` runs against real commands, passes |
| AC2 | PASS | `commands/test-design.md` Output section includes `tests/integration/` path |
| AC3 | PASS | `parseRequiredArtifacts` throws naming skill and malformation; behavioral test confirms |
| AC4 | PASS | `## Artifact Wiring Verification` section in `commands/implement.md` |
| AC5 | PASS | `## Artifact Wiring Verification` section in `commands/test-design.md` |
| AC6 | PASS | `skills/tdd/SKILL.md` has `## Required Artifacts` with 4-column format |
| AC7 | PASS | `parseRequiredArtifacts` returns null for skills without the section |
| AC8 | PASS | Condition column parsed but not used for relaxation; full pattern+path check applied |
| AC9 | PASS | `paths.some(p => outputSection.includes(p))` logic confirmed |
| AC10 | PASS | Existing test files confirmed present; no modifications |
| AC11 | PASS | `tests/fixtures/wiring-gap/` fixture present; `assert.throws` confirms gap detection |
| F1 | PASS | `exists()` guard at line 239 with named error; dedicated test |
| F4 | PASS | `extractSection` breaks only on headings of equal-or-shallower depth |

---

### Blocking Items (must resolve before merge)

1. **BLOCKING**: Replace phrase-binding source-text greps in `wiring-verification-e2e-chain.integration.test.js` lines 87-104 and 180-182 with behavioral assertions (function exports exist, fixture files exist). See suggested fix above.
