## Code Review: feature/ISS-027-codex-review-hardening
**Generated:** 2026-04-13T23:15:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent (Claude, fresh context)
**Reviewed in separate context from authoring phase** | Handoff produced_by: developer
**Diff:** `git diff main...HEAD`

---

### Summary

Clean, well-structured implementation of four review-method rules in `codex/reviewers/review-code.md`, process docs update in `docs/memory/codex-rules.md`, and two test files covering structural anchors (AC6) and installer coverage contract (AC7). The mechanism-agnostic `isCoveredByScript()` with copy-command-line restriction is a thoughtful design that avoids the overfit problem flagged in early reviews. All 39 tests pass. All 7 ACs are satisfied. No BLOCKING or HIGH findings.

### Verdict: APPROVE

---

### Findings

#### 1. suggestion (LOW): `isCoveredByScript()` ancestor matching does not cover space-terminated paths

**File:** tests/node/installer-coverage.test.js, `isCoveredByScript()` steps 3-4
**Issue:** Ancestor directory checks match `ancestor + '/'`, `ancestor + '"'`, `ancestor + '/*'`, and `ancestor + "'"`, but not `ancestor + ' '` (space) or end-of-line. A hypothetical `cp -r skills .claude` (without trailing `/`) would not match.
**Suggestion:** Theoretical gap only — the actual `init.sh` uses quoted paths with `/` termination. Consider adding `ancestor + ' '` to the delimiter set for completeness if the installer ever changes style. Not blocking.

#### 2. suggestion (LOW): AC5 keyword tests match whole-file, not section-scoped

**File:** tests/node/codex-review-method.test.js:801-835
**Issue:** The AC5 tests (e.g., "codex-rules.md references the install-path tracing rule") regex-match against the full file content. Keywords like "assertion" or "parser" could theoretically match in unrelated sections.
**Suggestion:** Currently `codex-rules.md` is small (~45 lines) so false-positive risk is negligible. If the file grows significantly, consider scoping assertions to the `## Review Method Rules` section. No action needed now.

#### 3. praise: Mechanism-agnostic installer contract design

**File:** tests/node/installer-coverage.test.js
The `isCoveredByScript()` function with its `isCopyLine()` guard is an excellent solution to the overfit problem. The 7 unit tests covering literal paths, directory copies, loops, no-reference, and echo/log false-positives provide strong regression protection. The `activeLines()` comment filter adds another defense layer. The exclusion cap (5 per script) and phantom-exclusion guard are smart safeguards against escape-hatch abuse.

#### 4. praise: Structural anchor test discipline

**File:** tests/node/codex-review-method.test.js
All 18 tests use heading-level regex anchors and keyword presence — no phrase-binding. The integration test verifying all four rules coexist in a single document is a good cohesion check. This follows the project's "no phrase-binding" convention correctly.

---

### Acceptance Criteria Check

| AC | Requirement | Verdict | Evidence |
|----|-------------|---------|----------|
| AC1 | Install-path tracing rule in review-code.md | PASS | `## Install-Path Tracing` with `**Apply when:**` trigger, `init.sh` + `upgrade.sh` refs, mechanism-agnostic guidance |
| AC2 | Test-truthfulness rule in review-code.md | PASS | `## Test-Truthfulness Verification` with trigger, "test name" + "assertion" behavioral checks |
| AC3 | Parser edge-case checklist in review-code.md | PASS | `## Parser/Validator Edge-Case Checklist` with trigger, 4-category malformed-input matrix, severity guidance |
| AC4 | Unchanged-file scope rule in review-code.md | PASS | `## Unchanged-File Scope Expansion` with trigger, deliberate scope expansion, anti-speculation rule |
| AC5 | docs/memory/codex-rules.md updated | PASS | `## Review Method Rules` with all 4 rules; `review-process.md` defers to `codex-rules.md` |
| AC6 | Structural anchor tests for AC1-AC4 | PASS | 18 tests: per-rule heading anchors + keyword assertions + integration cohesion test |
| AC7 | Installer coverage contract test | PASS | 19 tests: mechanism-agnostic `isCoveredByScript()`, `activeLines()` filter, exclusion cap, phantom guard, 7 unit tests |

---

### Test Assessment

- [x] New code has corresponding tests — both test files directly cover their ACs
- [x] Edge cases are covered — comment filtering, echo/log false-positives, exclusion cap, phantom exclusion guard
- [x] No skipped tests introduced — verified via automated check
- [x] Tests are testing behaviour, not implementation — mechanism-agnostic contract; structural anchors survive rewording

### Convention Compliance

- [x] Follows project folder structure
- [x] Naming conventions respected — `*.test.js`, kebab-case feature directory
- [x] No `any` types — plain JavaScript
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format
- [x] Structural anchors used, not phrase-binding (per CLAUDE.md convention)
