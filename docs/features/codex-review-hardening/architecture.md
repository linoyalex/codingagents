## Architecture: Codex Review Hardening
**Generated:** 2026-04-13T21:30:00Z
**ADR:** ADR-ISS-027 | **Date:** 2026-04-13

---

### Decision

Add three conditional review checklists and one scope-expansion rule to `codex/reviewers/review-code.md`, update `docs/memory/codex-rules.md` as the canonical Codex expectations doc, and add two test files: one for review-method structural anchors (AC6) and one for installer coverage contract (AC7). Each checklist activates only when its trigger condition is met in the diff — no checklist work is generated for inapplicable rules.

### Decision Confidence

**High.** The three gap classes (install-path, test-truthfulness, parser edge-cases) are empirically validated from ISS-009 re-reviews. The fix is additive prompt guidance, not structural refactoring.

### Revisit When

- Codex gains native tool-use that can programmatically verify install paths or test assertions (prompt-level checklists become redundant).
- The reviewer prompt exceeds ~150 lines total — at that point, split into modular sub-prompts.
- `init.sh`/`upgrade.sh` are replaced by a manifest-driven installer (AC7 test strategy may need rework).

### Rollback / Fallback

Revert the added sections from `review-code.md` and remove the two test files. No schema changes, no data model changes, no hook modifications — rollback is a single revert commit.

---

### Files Changed

| File | Change | AC |
|------|--------|----|
| `codex/reviewers/review-code.md` | Add 3 checklist sections + scope rule | AC1-AC4 |
| `docs/memory/codex-rules.md` | Update with stronger review expectations | AC5 |
| `tests/node/codex-review-method.test.js` | Structural anchor tests for AC1-AC4 | AC6 |
| `tests/node/installer-coverage.test.js` | Contract test for source→installer mapping | AC7 |

### Module Boundaries

| Owner | Files | Must NOT cross into |
|-------|-------|--------------------|
| Codex review layer | `codex/reviewers/review-code.md` | Claude skills (`skills/`), commands (`commands/`), hooks (`hooks/`) |
| Codex process docs | `docs/memory/codex-rules.md` | Claude agent memory (`.claude/agent-memory/`) |
| Test suite | `tests/node/codex-review-method.test.js`, `tests/node/installer-coverage.test.js` | Source files under test (read-only assertions, no modifications) |

---

### Review-Code.md Changes (AC1–AC4)

Add four new sections to `codex/reviewers/review-code.md` after the existing "Review Heuristics" section:

**1. Install-Path Tracing (AC1)**
Trigger: diff introduces a new file, helper, or path dependency.
Rule: Inspect `init.sh`, `upgrade.sh`, and any generation/bootstrap files to verify the new dependency is operationalized for fresh installs and upgrades. If the dependency is not copied/installed, flag as BLOCKING.

**2. Test-Truthfulness Verification (AC2)**
Trigger: diff includes test files.
Rule: For each test, compare the test name/description to the assertion body. If the name claims a property (e.g., "sync check", "parity", "regression") that the assertions do not fully verify, flag as MAJOR. Especially scrutinize tests with names containing "sync", "parity", "full", "complete", or "regression".

**3. Parser/Validator Edge-Case Checklist (AC3)**
Trigger: diff modifies a parser, validator, or input-handling function.
Rule: Enumerate the malformed-input shapes relevant to the changed code (empty input, missing fields, wrong types, oversized values, injection payloads). Verify direct test coverage for each important shape. If shapes are untested, flag as MAJOR.

**4. Unchanged-File Scope Expansion (AC4)**
Trigger: diff changes a file that is installed, generated, copied, or operationalized by another file.
Rule: The operationalizing file (even if unchanged) is in scope. Open it and verify it handles the changed file correctly. This applies to installers, generators, copy scripts, and source-of-truth registries.

Each section includes its trigger condition so the reviewer skips it when inapplicable.

---

### Process Docs Update (AC5)

**Canonical doc:** `docs/memory/codex-rules.md`.

Add a "Review Method" section summarizing the four new rules (AC1-AC4) with back-references to `codex/reviewers/review-code.md` for full details. If `docs/memory/review-process.md` contains Codex-specific review guidance, add a one-line deferral: "For Codex-specific review expectations, see `docs/memory/codex-rules.md`."

---

### Test Strategy

**AC6 — Structural anchor tests** (`tests/node/codex-review-method.test.js`):

Four test cases, one per rule, using `node:test` and `node:assert`. Each test:
1. Reads `codex/reviewers/review-code.md` as a string.
2. Asserts the presence of a structural heading anchor (e.g., `/^## Install-Path Tracing/m` or equivalent).
3. Asserts the section contains the key behavioral keyword (e.g., "init.sh", "upgrade.sh" for AC1; "test name" and "assertion" for AC2; "malformed" or "edge" for AC3; "unchanged" and "scope" for AC4).

These are structural anchors, not phrase-binding — they survive wording changes as long as the section exists and covers the right topic.

**AC7 — Installer coverage contract test** (`tests/node/installer-coverage.test.js`):

Strategy: behavioral contract test that verifies every source file reaches the target project.

1. Glob source files: `skills/*/SKILL.md`, `commands/*.md`, `hooks/*.js`.
2. Read `init.sh` content as a string.
3. For each source file, derive its expected installed path (e.g., `skills/foo/SKILL.md` → `.claude/skills/foo/SKILL.md`).
4. Assert the installed path appears somewhere in `init.sh` — this matches literal `cp`, `mkdir -p && cp`, loop bodies, manifest entries, or directory copies. The assertion is path-presence, not mechanism-specific.
5. Repeat for `upgrade.sh` where applicable (some files may only need init-time setup).

**Exclusion list:** If specific source files are intentionally not copied (e.g., test-only fixtures), maintain an explicit exclusion array in the test file with a comment explaining each exclusion. This prevents false failures while keeping the contract visible.

---

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| `codex/reviewers/review-code.md` content | Structural anchor tests verify required sections exist | Must not be loaded as executable code — read as UTF-8 text only |
| `init.sh` / `upgrade.sh` content | Read as string for path-presence assertions | Must not be executed by tests — read-only string matching |
| Source file globs | Glob patterns are hardcoded constants, not user input | Must not accept dynamic glob patterns from external input |

---

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| New source file added, AC7 test not run | Silent installer gap (the original problem) | AC7 test runs in CI on every PR; test file is in `tests/node/` which is globbed by `pnpm test` |
| Review-code.md section heading renamed | AC6 tests fail | Intentional — heading rename requires updating tests, preventing silent drift |
| Installer refactored to use manifest | AC7 tests may false-fail if path strings change format | Test checks path-presence, not mechanism; manifest entries still contain target paths. Revisit trigger documented above |
| Reviewer applies checklist to inapplicable diff | Wasted review effort, false findings | Each rule section starts with an explicit trigger condition; "No-test / no-parser diff" state documented in PRD |

---

### Fitness Functions

1. **Installer coverage completeness:** Every source file in `skills/`, `commands/`, `hooks/` has a corresponding path in `init.sh` (AC7 test — run in CI).
2. **Review method structural integrity:** All four rule sections exist in `review-code.md` with required keywords (AC6 test — run in CI).

---

### Rejected Alternatives

1. **Programmatic review checks (lint rules for test names, AST analysis for assertion coverage):** Rejected because the current gap is in the reviewer prompt methodology, not in automated tooling. Programmatic checks could supplement but don't address the root cause — the reviewer not knowing to look. Revisit when Codex supports tool-use.

2. **Embedding rules directly in `docs/memory/codex-rules.md` without updating `review-code.md`:** Rejected because `review-code.md` is the actual reviewer prompt. Process docs alone don't change reviewer behavior — the prompt does. The process doc (AC5) is a secondary reference, not the primary enforcement point.

3. **Single combined test file for AC6 + AC7:** Rejected because the two test concerns are independent — review method structural integrity vs. installer contract. Separate files improve failure diagnosis and allow independent ownership.
