## Code Review: feature/ISS-027-codex-review-hardening
**Generated:** 2026-04-13T18:45:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent (Claude, fresh context)
**Reviewed in separate context from authoring phase** | Handoff produced_by: developer
**Diff:** `git diff main...HEAD`

---

### Summary

Clean, well-structured implementation that adds four conditional review-method rules to `codex/reviewers/review-code.md` (AC1-AC4), updates `docs/memory/codex-rules.md` as the canonical Codex expectations doc (AC5), and adds two test files: 19 structural anchor tests for AC6 and 24 mechanism-agnostic installer coverage contract tests for AC7. All 43 tests pass. The `isCoveredByScript()` design with its `isInertLine` blacklist is a thoughtful solution to the mechanism-agnosticism requirement. The approach correctly matches the PRD and architecture — no gaps, no scope creep, and no phrase-binding in tests. The ISS-044 ticket filed from architecture review feedback is a legitimate process improvement tracked separately.

### Verdict: APPROVE

---

### Findings

#### 1. suggestion (LOW): `isInertLine` blacklist may under-filter exotic inert patterns

**File:** tests/node/installer-coverage.test.js:116
**Issue:** The blacklist filters `echo`, `printf`, `log`, `print`, but shell scripts may also mention paths in file-existence checks (`test -f`, `[ -f ... ]`), variable assignments used only for logging, or `ls` commands. These would not be filtered and could produce false-positive coverage matches.
**Suggestion:** The narrow blacklist is the right tradeoff for mechanism-agnosticism — a broader blacklist risks rejecting valid installer patterns. Document the design intent (narrow blacklist, accept minor false-positive risk) in a code comment. Not blocking; current init.sh/upgrade.sh don't use these patterns for path references.

#### 2. suggestion (LOW): `isInertLine` regex has redundant `\s*` after `trimStart()`

**File:** tests/node/installer-coverage.test.js:116
**Issue:** The function calls `line.trimStart()` then tests against `/^\s*(echo|...)/`. The `\s*` is redundant since leading whitespace is already stripped. Not a correctness issue — just minor clarity.
**Suggestion:** Simplify to `/^(echo|printf|log|print)\b/` after `trimStart()`, or remove `trimStart()` and rely on the regex. No action required.

#### 3. praise: Mechanism-agnostic installer contract design

**File:** tests/node/installer-coverage.test.js
The `isCoveredByScript()` function with its 4-step coverage check (literal path, source path, ancestor directory, source ancestor) paired with the `isInertLine` blacklist is an excellent solution. The 10 unit tests covering literal paths, directory copies, loops, manifests, helper functions, space-terminated ancestors, no-reference, and three echo/log false-positive variants provide strong regression protection. The exclusion cap (5 per script) and phantom-exclusion guard are smart safeguards against escape-hatch abuse. This directly addresses the PRD review feedback about mechanism-agnosticism.

#### 4. praise: Structural anchor test discipline

**File:** tests/node/codex-review-method.test.js
All 19 tests use heading-level regex anchors and keyword presence — no phrase-binding anywhere. The AC5 tests use section-scoped matching via `readCodexRulesReviewSection()`, which correctly limits assertions to the `## Review Method Rules` section. The integration test verifying all four rules coexist is a good cohesion check. This follows the project's "no phrase-binding" convention from docs/CLAUDE.md.

#### 5. praise: review-process.md deduplication

**File:** docs/memory/review-process.md
Removing the duplicated file-ownership table and replacing it with a deferral to `codex-rules.md` follows the "do not duplicate information across locations" rule from CLAUDE.md. Clean execution.

---

### Acceptance Criteria Check

| AC | Requirement | Verdict | Evidence |
|----|-------------|---------|----------|
| AC1 | Install-path tracing rule in review-code.md | PASS | `## Install-Path Tracing` with trigger condition, init.sh + upgrade.sh refs, mechanism-agnostic guidance |
| AC2 | Test-truthfulness rule in review-code.md | PASS | `## Test-Truthfulness Verification` with trigger, "test name" + "assertion" behavioral checks |
| AC3 | Parser edge-case checklist in review-code.md | PASS | `## Parser/Validator Edge-Case Checklist` with trigger, 4-category malformed-input matrix, severity guidance |
| AC4 | Unchanged-file scope rule in review-code.md | PASS | `## Unchanged-File Scope Expansion` with trigger, deliberate scope expansion, anti-speculation rule |
| AC5 | docs/memory/codex-rules.md updated | PASS | `## Review Method Rules` section with all 4 rules; review-process.md defers to codex-rules.md |
| AC6 | Structural anchor tests for AC1-AC4 | PASS | 19 tests: per-rule heading + keyword assertions, section-scoped AC5 tests, integration cohesion test |
| AC7 | Installer coverage contract test | PASS | 24 tests: mechanism-agnostic isCoveredByScript(), activeLines() filter, exclusion cap, phantom guard, 10 unit tests for coverage logic |

---

### Test Assessment

- [x] New code has corresponding tests — both test files directly cover their ACs
- [x] Edge cases are covered — comment filtering, echo/log false-positives, exclusion cap, phantom exclusion guard, space-terminated ancestors
- [x] No skipped tests introduced — verified via automated check
- [x] Tests are testing behaviour, not implementation — mechanism-agnostic contract; structural anchors survive rewording

### Convention Compliance

- [x] Follows project folder structure
- [x] Naming conventions respected — `*.test.js`, kebab-case feature directory
- [x] No `any` types — plain JavaScript
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format
- [x] Structural anchors used, not phrase-binding (per docs/CLAUDE.md convention)
