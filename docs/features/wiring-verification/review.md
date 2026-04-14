## Code Review: feature/ISS-036-wiring-verification
**Generated:** 2026-04-14T02:05:47Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

The wiring-verification feature adds a clean 4-stage library (`lib/wiring-check.js`) plus
44 tests at unit/contract/integration/E2E layers, all passing. The prior blocking issue (F1:
missing `exists()` guard in `checkCommandSkillWiring`) has been resolved — the guard is in
place at line 239. The `extractSection` depth-aware truncation fix (F4) is also confirmed
correct. One convention violation remains: two E2E tests scan a JavaScript test file's own
source text for phrase-match assertions, directly violating the `docs/CLAUDE.md` prohibition
on phrase-binding tests.

---

### Verdict: REQUEST_CHANGES

One blocking convention violation. Two non-blocking suggestions. One praise.

---

### Findings

**issue (BLOCKING): E2E tests use phrase-binding on JavaScript source text**

File: `tests/integration/wiring-verification-e2e-chain.integration.test.js:87-104, 180-182`

Two test blocks read `tests/node/command-skill-wiring.test.js` as a string and grep it for
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
changing a comment string breaks the test without any behaviour change.

The intent of the test at lines 82-104 — verifying that the production test covers all four
stages — is valid, but the mechanism is wrong. The correct approach is to import the library
and assert on its exports or run the algorithm:

```js
// Instead of reading the source file, import and exercise the functions
const { parseSkillReferences, parseRequiredArtifacts, checkArtifactWiring, checkCommandSkillWiring } = require('../../lib/wiring-check');
// All four stages are exercised if these imports succeed and their contracts hold
assert.equal(typeof parseSkillReferences, 'function', 'Stage 1 function must be exported');
assert.equal(typeof parseRequiredArtifacts, 'function', 'Stage 2 function must be exported');
assert.equal(typeof checkArtifactWiring, 'function', 'Stage 3 function must be exported');
// Stage 4 (negative fixture) is already covered by the dedicated fixture test
assert.ok(exists('tests/fixtures/wiring-gap/mock-skill.md'), 'Stage 4 fixture must exist');
```

For lines 180-182 (asserting `assert.throws` appears in the source), the negative fixture
already has its own behavioral test (`AC11 (behavioral)`) that actually calls the function
and asserts it throws — that test is the correct structural anchor; the source-grep is
redundant and fragile.

---

**suggestion (MEDIUM): AC4 and AC5 contract tests are structurally shallow**

File: `tests/contracts/wiring-verification.test.js:113-131`

The AC4 and AC5 tests use `assert.match` against command file text with broad keyword
patterns like `/artifact/i` and `/output/i`. These will pass on any document containing
those words. The behavioral test would be stronger: run `checkCommandSkillWiring` against
`implement.md` or `test-design.md` and assert it passes — that is the actual AC contract
(the command wires every skill artifact it declares). The structural presence test is
redundant when the behavioral test already exercises the same path.

This is not blocking because the behavioral test (`AC1` in the contract tests and the live
discovery tests in `command-skill-wiring.test.js`) does run the full check — the shallow
structural tests add noise but do not mask a real gap.

---

**suggestion (LOW): `## Skill References` tables are duplicated across `commands/` and `.claude/commands/`**

File: All command files in diff

Both `commands/*.md` and `.claude/commands/*.md` receive identical `## Skill References`
table additions. The E2E test at line 146-160 asserts byte-identity of
`skills/tdd/SKILL.md` vs `.claude/skills/tdd/SKILL.md`, but there is no parallel test
asserting byte-identity of the command copies. If one copy of a command is edited and
the other is not, the wiring check (which reads `commands/`) will silently diverge from
what the agent actually loads (`.claude/commands/`). The ISS-009 sync pattern that works
for skills should also cover commands.

---

**praise (NIT): F1 fix is clean and consistent with the rest of the module**

File: `lib/wiring-check.js:239-243`

The `exists()` guard added to `checkCommandSkillWiring` throws a named error with the
command name, skill name, and file path — exactly matching the error message quality
established throughout the rest of the library. No raw ENOENT bubbles out of any public
function now. The fix also has a dedicated test (`F1: checkCommandSkillWiring throws named
error when skill file does not exist`) that exercises the error path with a fabricated
path, confirming the guard is reachable.

---

### Test Assessment

- [x] New code has corresponding tests — 44 tests across unit, contract, integration, E2E layers
- [x] Edge cases are covered — conditional artifacts (AC8), multi-path (AC9), empty skill (AC7), malformed table (AC3), missing Output section, fail-closed heuristic
- [x] No skipped tests introduced — `result.skipped` references are value assertions, not skip directives; confirmed by grep
- [ ] Tests are testing behaviour, not implementation — **fails**: E2E test reads JavaScript source text and phrase-matches for implementation markers (see BLOCKING finding)

---

### Convention Compliance

- [x] Follows project folder structure (`lib/`, `tests/node/`, `tests/contracts/`, `tests/fixtures/`, `tests/integration/`)
- [x] Naming conventions respected — kebab-case fixtures, camelCase functions, no regressions
- [x] No `any` types (JavaScript project — not applicable)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format (feat:, test:, chore:)
- [ ] No phrase-binding tests — **fails**: `wiring-verification-e2e-chain.integration.test.js` lines 90-102, 181

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
| AC7 | PASS | `parseRequiredArtifacts` returns null for skills without the section; behavioral test runs against real skill |
| AC8 | PASS | Condition column parsed but not used for test-time relaxation; same full pattern+path check applied |
| AC9 | PASS | `paths.some(p => outputSection.includes(p))` logic confirmed; behavioral test covers both branches |
| AC10 | PASS | Existing test files confirmed present; no modifications to existing tests |
| AC11 | PASS | `tests/fixtures/wiring-gap/` fixture present; `assert.throws` confirms gap detection |
| F1 | PASS | `exists()` guard at line 239 with named error; dedicated test exercises the path |
| F4 | PASS | `extractSection` breaks only on headings of equal-or-shallower depth; verified with `### Notes` sub-heading test |

---

### Blocking Items (must resolve before merge)

1. **BLOCKING**: Remove phrase-binding source-text greps from `wiring-verification-e2e-chain.integration.test.js` — replace with behavioral assertions (function exports exist, fixture files exist, negative fixture throws). The two failing checks are at lines 87-104 and 180-182.
