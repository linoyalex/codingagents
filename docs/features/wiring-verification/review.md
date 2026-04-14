## Code Review: feature/ISS-036-wiring-verification

**Generated:** 2026-04-13T15:30:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

The wiring-verification feature delivers a well-structured 4-stage algorithm (`parseSkillReferences` → `parseRequiredArtifacts` → `checkArtifactWiring` → `checkCommandSkillWiring`) that catches command↔skill artifact drift. The implementation covers all 5 ACs from ISS-036, includes tests at contract/unit/integration layers, and error messages throughout are consistently actionable. One blocking issue (missing existence guard) and three non-blocking suggestions.

---

### Verdict: REQUEST_CHANGES

One blocking issue. Three non-blocking suggestions.

---

### Findings

issue (BLOCKING): F1 — `checkCommandSkillWiring` reads skill file without existence guard

File: lib/wiring-check.js:233
`checkCommandSkillWiring` calls `read(skillRef.sourcePath)` directly without checking `exists(skillRef.sourcePath)` first. The `exists()` helper is defined in the module and used in tests, but not called here. If a command's `## Skill References` table points to a skill file that was moved or deleted, the check throws a raw `ENOENT` from `fs.readFileSync` instead of a named error identifying the command and skill — violating the pattern the implementation correctly applies everywhere else.
Suggestion: Add `if (!exists(skillRef.sourcePath)) { throw new Error(\`Command '${commandName}' references skill '${skillRef.skill}' but file not found: ${skillRef.sourcePath}\`) }` before line 233.

---

suggestion (MEDIUM): F2 — Contract tests use phrase-binding instead of structural anchors

File: tests/contracts/wiring-verification.test.js
Several AC assertions (AC1, AC3, AC7, AC9) grep the wiring test's source text for keyword presence, e.g., `assert.match(wiringTest, /skip|no required artifacts|no wiring/i)`. This couples the contract layer to implementation wording — renaming a variable or rephrasing a comment breaks the contract test even though behavior is identical. The project's convention in `docs/CLAUDE.md` explicitly requires "structural anchors, not phrase-binding."
Suggestion: Import the library functions and assert on their return values rather than scanning the test source text.

---

suggestion (MEDIUM): F3 — `tests/e2e/wiring-verification.spec.js` is misclassified as E2E

File: tests/e2e/wiring-verification.spec.js
The file imports from `lib/wiring-check` and runs entirely in-process against static files. It is an integration test, not an E2E test. Placing it under `tests/e2e/` risks runner confusion since `pnpm test:e2e` may target a different runner (e.g., Playwright).
Suggestion: Move to `tests/integration/` or merge into the existing integration test file.

---

suggestion (MEDIUM): F4 — `extractSection` truncates on sub-headings inside the target section

File: lib/wiring-check.js (extractSection function)
`extractSection` breaks on any `/^#{1,6} /` match after the target heading. A `### Notes` sub-heading inside a `## Required Artifacts` section would cause artifact rows after it to be silently dropped. For a hard gate, silent truncation is a correctness risk.
Suggestion: Break only on headings of the same depth or shallower, or document and test the constraint explicitly.

---

praise (NIT): F5 — Error messages in `lib/wiring-check.js` are excellent

Every `throw new Error(...)` in the library names the skill, the command, and the specific missing element (pattern, path, column). A developer seeing a failure would know immediately what file to open and what to fix. This is the standard all error messages in this codebase should follow.

---

### Test Assessment

- [x] New code has corresponding tests — contract, unit, integration layers present
- [x] Edge cases are covered — conditional artifacts, multi-path, empty skill, malformed table
- [x] No skipped tests introduced — grep hit on `result.skipped` is a value assertion, not a skip directive
- [ ] Tests are testing behaviour, not implementation — **partial**: contract tests grep source text for keywords (see F2)

---

### Convention Compliance

- [x] Follows project folder structure (`lib/`, `tests/node/`, `tests/contracts/`, `tests/fixtures/`)
- [x] Naming conventions respected
- [x] No `any` types (JavaScript project — N/A)
- [x] No hardcoded secrets or credentials
- [x] Source and installed command copies are byte-identical per ISS-009 sync pattern
- [x] Commit messages follow format

---

### AC Coverage

| AC | Status | Evidence |
|----|--------|---------|
| AC1 | PASS | `checkCommandSkillWiring` validates pattern + output path for each artifact |
| AC2 | PASS | `## Artifact Wiring Verification` section added to `commands/implement.md` |
| AC3 | PASS | `## Artifact Wiring Verification` section added to `commands/test-design.md` |
| AC4 | PASS | `## Required Artifacts` section convention established in `skills/tdd/SKILL.md` |
| AC5 | PASS | Existing tests pass; wiring test catches integration-test-coverage gap against pre-fix fixtures |

---

### Blocking Items (must resolve before merge)

1. **F1** — Add `exists()` guard in `checkCommandSkillWiring` before `read(skillRef.sourcePath)`, throwing a named error on missing file
