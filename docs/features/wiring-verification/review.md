## Code Review: feature/ISS-036-wiring-verification

**Generated:** 2026-04-13T23:58:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

The core implementation in `tests/node/command-skill-wiring.test.js` is correct, well-structured, and passes all 18 of its own tests. However, 8 tests across `tests/contracts/` and `tests/e2e/` and `tests/integration/` are failing in the GREEN state. Three distinct bugs are present: (1) a false-positive regex in the contract/e2e tests matches a comment in the implementation, tripping an `assert.doesNotMatch` check meant to verify AC8; (2) the contract and e2e tests assert the word "artifact" appears in `commands/implement.md` and `commands/test-design.md` for AC4/AC5, but no such word was added; and (3) the integration tests use `execSync` to invoke `node --test` from within a `node --test` runner, which Node silently skips due to the recursive test runner guard, producing no output and causing three assertions to fail.

### Verdict: REQUEST_CHANGES

---

### Findings

#### [BLOCKING]: 3 integration tests structurally cannot pass — recursive node:test runner suppression

**File:** `tests/integration/wiring-verification.integration.test.js:42, 59, 77`

**Issue:** All three integration tests call `execSync('node --test "<WIRING_TEST>" 2>&1', ...)` from inside a test file that is itself already being run by `node --test`. Node 22 detects this and emits a warning — "node:test run() is being called recursively within a test file. skipping running files." — and produces no test output whatsoever. Every assertion on the subprocess output then fails. The tests cannot pass under any circumstances when run via the standard `node --test tests/integration/` invocation.

**Suggestion:** Replace `execSync` with a direct `require()` of the helper functions exported from (or extracted from) `command-skill-wiring.test.js`, and call them in-process. Alternatively, if a subprocess is truly needed, use `spawnSync('node', ['--test', WIRING_TEST])` invoked from a standalone script that is NOT itself a `node --test` file — or add an `--experimental-test-isolation` flag and isolate each subtest. The simplest fix is to extract the four stage functions into a module (`lib/wiring-check.js`) and `require` that module directly in the integration tests.

---

#### [BLOCKING]: Contract test AC8 regex false-positives on implementation comment, causing spurious failure

**File:** `tests/contracts/wiring-verification.test.js:162` (and `tests/e2e/wiring-verification.spec.js:126`)

**Issue:** The AC8 contract test uses `assert.doesNotMatch(wiringTest, /skip.*condition|ignore.*condition|condition.*skip|condition.*ignore/i)` to prove the implementation does not bypass conditional artifacts. The implementation file contains the JSDoc comment `"AC8: Condition column is ignored -- all artifacts receive the same check."` The substring `"Condition column is ignore"` matches the regex arm `condition.*ignore` (case-insensitive), causing `doesNotMatch` to throw even though the implementation is correct. The test is testing the right behaviour with the wrong technique.

**Suggestion:** Replace the full-source-scan regex approach with a behavioural test: construct a minimal conditional-artifact fixture inline and verify `checkArtifactWiring` throws when the pattern is missing. This is already done correctly in the node test at line 526 (`AC8 (full check)`). The contract test AC8 should delegate to the node test's behavioural verification rather than doing source-code scanning with fragile string matching.

---

#### [BLOCKING]: AC4 and AC5 contract/e2e tests fail — `commands/implement.md` and `commands/test-design.md` lack the word "artifact"

**File:** `tests/contracts/wiring-verification.test.js:117` (AC4), `tests/contracts/wiring-verification.test.js:130` (AC5), `tests/e2e/wiring-verification.spec.js:78` (E2E AC4)

**Issue:** The AC4 contract test asserts `assert.match(implement, /artifact/i)` and `assert.match(implement, /output slot|output instruction|naming pattern/i)`. The AC5 test asserts `assert.match(testDesign, /Required Artifacts|artifact/i)`. Neither command file contains the word "artifact" after the implementation. The `## Output` sections added to each command mention paths and patterns but do not include an explicit wiring-verification instruction directing the agent to check for `## Required Artifacts` or use the word "artifact". The tests codify a requirement (the commands must contain a human-readable verification checklist step) that was not implemented.

**Suggestion:** Add an explicit verification checklist item to each command. For `commands/implement.md`, add a step such as: "Before committing GREEN, verify that every skill artifact declared in `## Required Artifacts` has a corresponding output instruction — check the Output section for both the naming pattern AND the target path." For `commands/test-design.md`, add a comparable step referencing the TDD skill's `## Required Artifacts` table. These are AC4 and AC5 respectively and are genuinely missing from the implementation.

---

#### [HIGH]: Core logic functions are not exported — cannot be unit-tested by other modules

**File:** `tests/node/command-skill-wiring.test.js:45-302`

**Issue:** `parseSkillReferences`, `parseRequiredArtifacts`, `checkArtifactWiring`, and `checkCommandSkillWiring` are defined as module-local functions inside a test file. This makes it impossible to `require` them from integration tests or other consumers without executing all top-level `test()` calls. The integration test awkwardly works around this by running a subprocess rather than importing the logic — and that workaround causes the BLOCKING failure above. Conflating the library and the test harness in a single file creates structural fragility.

**Suggestion:** Extract the four stage functions into a dedicated module at `lib/wiring-check.js` (or `src/lib/`). The test file `tests/node/command-skill-wiring.test.js` then requires that module and tests it. Integration tests also require it directly. This resolves both the import problem and the subprocess failure without needing subprocess invocation at all.

---

#### [MEDIUM]: `extractSection` stops at the first heading of ANY level after the target — including lower-level headings inside the section

**File:** `tests/node/command-skill-wiring.test.js:71`

**Issue:** The regex `if (inSection && /^#{1,6} /.test(line))` treats any heading — including `###`, `####`, etc. — as a section boundary. If a skill ever has a sub-heading inside `## Required Artifacts` (e.g., `### Notes`), the parser will silently truncate the table, potentially missing data rows without error. This is a latent correctness bug that will be hard to debug when triggered.

**Suggestion:** Narrow the boundary detection to headings of the same or higher level as the section heading: since `## Required Artifacts` is a level-2 heading, stop only at `^#{1,2} ` (another `##` or `#`). Alternatively, accept any heading that is level 1 or 2 to keep parity with standard markdown document structure.

---

#### [MEDIUM]: Pattern matching uses substring inclusion — susceptible to spurious matches

**File:** `tests/node/command-skill-wiring.test.js:255, 263`

**Issue:** `outputSection.includes(pattern)` and `outputSection.includes(p)` do pure substring matching. The pattern `[feature].integration.test.*` is a glob/regex-like string; if a command output happens to mention `integration.test.` in a different context (e.g., "Do not delete integration.test.* files"), the check passes even when the wiring is absent. Conversely, a command using a slightly different notation (`[FEATURE].integration.test.*`) would incorrectly fail. There is no case-insensitive option, and no glob-style anchor.

**Suggestion:** Document the matching contract explicitly in the JSDoc and in the skill's `## Required Artifacts` format description. At minimum, clarify that patterns are matched case-sensitively as substrings. A stronger fix would require the Output section to mention the pattern in a structured context (e.g., as part of a bullet line containing both "pattern" and the path), which is how the TDD skill's content is actually written and how the existing tests pass.

---

#### [PRAISE]: The 4-stage architecture is well-decomposed and the primary test file is exemplary

**File:** `tests/node/command-skill-wiring.test.js`

The separation of concerns across `extractSection`, `parseSkillReferences`, `parseRequiredArtifacts`, `checkArtifactWiring`, and `checkCommandSkillWiring` is clean and each function has a single responsibility. The JSDoc on every helper is precise and includes `@param`/`@returns` types. The inline AC references (`// AC7:`, `// AC8:`, `// AC9:`) link each code decision to its acceptance criterion. The fail-closed design — require a `## Skill References` table if skill prose is present — is a sound default. All 18 tests in this file pass. The negative fixture pattern (a deliberately broken `mock-command.md`) is a solid regression anchor. This is the level of quality the project should hold for all future contract tests.

---

### AC Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Contract test verifies command contains output instructions for each skill artifact (pattern + path) | PASS | Stage 3 test passes; checkArtifactWiring validates both |
| AC2 | Test catches known tdd/test-design integration-test gap | PASS | `Stage 3 (AC1 + AC2)` test passes; test-design.md Output section includes `tests/integration/` |
| AC3 | Malformed registry produces parse error naming skill | PASS | Two AC3 tests pass in node test file |
| AC4 | Phase 5 verification step in commands/implement.md | FAIL | Contract test fails: implement.md has `## Output` and `## Skill References` but no "artifact" keyword and no explicit wiring-verification checklist step |
| AC5 | Phase 3 verification step in commands/test-design.md | FAIL | Contract test fails: test-design.md has `## Output` and `## Skill References` but no "artifact" keyword and no explicit wiring-verification checklist step |
| AC6 | Registry format: Markdown table with Artifact|Pattern|Path|Condition columns | PASS | skills/tdd/SKILL.md table parses correctly |
| AC7 | Skills with no Required Artifacts section pass | PASS | Node test AC7 passes |
| AC8 | Conditional artifacts: full pattern+path check (Condition column is informational only) | PARTIAL PASS | Node test implementation is correct and passes; contract/e2e test fails due to regex false-positive on implementation comment |
| AC9 | Multiple output paths: passes if at least one matches | PASS | Node test AC9 passes; `paths.some()` logic correct |
| AC10 | No regression on existing tests | PASS | All 19 pre-existing tests pass |
| AC11 | Negative test fixture with mock skill+command and known gap | PASS | Fixture files exist and AC11 node tests pass |

**AC4, AC5:** The `## Output` sections added to both commands satisfy the structural requirement (Skill References table + Output section) but the commands do not contain an explicit checklist item instructing the agent to verify wiring via `## Required Artifacts`. This is the literal requirement from the PRD: "Phase 5 verification step" and "Phase 3 verification step" — the human/agent must be told to run the check, not just have the outputs listed.

**AC8:** Implementation is behaviourally correct. The failure is in the contract/e2e test's brittle source-scanning assertion, not in the implementation.

---

### Test Assessment

- [x] New code has corresponding tests — 18 tests in the node file, plus contract/e2e/integration shells
- [ ] Edge cases are covered — AC8 edge case has a false-positive in the contract test assertion
- [ ] No skipped tests introduced — no `.skip` found; but 8 tests are structurally failing
- [x] Tests are testing behaviour, not implementation — node test file tests behaviour; contract/e2e files mix source-scanning with behavioural checks

**Specific test failures (all blocking or high severity):**
1. `AC4: commands/implement.md includes wiring verification step` — FAILS
2. `AC5: commands/test-design.md includes wiring verification step` — FAILS
3. `AC8: conditional artifacts receive the same full pattern+path validation` — FAILS (false positive)
4. `E2E: implement command has wiring verification step and Skill References table` — FAILS (same as AC4)
5. `E2E (AC8): conditional artifact fixture exercised with no relaxation` — FAILS (same false positive)
6. `integration: command-skill-wiring test runs end-to-end and produces visible output` — FAILS (recursive runner)
7. `integration: wiring test negative fixture detects missing artifact slot` — FAILS (recursive runner)
8. `integration: wiring test output identifies skill, command, and artifact when gap detected` — FAILS (recursive runner)

---

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/node/`, fixtures in `tests/fixtures/`
- [x] Naming conventions respected — snake_case for fixtures, camelCase for functions
- [x] No `any` types without documented reason — JavaScript, not TypeScript; N/A
- [x] No hardcoded values — ROOT_DIR derived via `path.resolve`, not hardcoded
- [x] Commit messages follow format — "feat: wiring-verification GREEN", "test: wiring-verification failing shells (RED)" follow the project convention
- [ ] All tests pass — 8 failures across contract/e2e/integration test files

---

### Required Fixes Before Merge

1. **BLOCKING — Integration tests:** Extract `parseSkillReferences`, `parseRequiredArtifacts`, `checkArtifactWiring`, and `checkCommandSkillWiring` into a `lib/wiring-check.js` module so integration tests can import them directly instead of spawning a subprocess.

2. **BLOCKING — AC8 contract/e2e false positive:** Replace the `doesNotMatch(/skip.*condition|...)` source-scan with a behavioural assertion (construct a conditional-artifact object, call `checkArtifactWiring` without the pattern, assert it throws).

3. **BLOCKING — AC4/AC5 missing verification steps:** Add explicit wiring-verification checklist items to `commands/implement.md` and `commands/test-design.md` that reference "Required Artifacts" or "artifact wiring" so the human/agent is instructed to verify the wiring, not just record the outputs.
