## Code Review: feature/ISS-026-artifact-timestamps
**Generated:** 2026-04-12T10:45:00Z
**Date:** 2026-04-12 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary

This PR introduces a `**Generated:** <ISO 8601>` timestamp convention to every
pipeline-generated feature artifact. The approach is correct — updating command
instructions, Codex reviewer prompts, skill templates, and `docs/CLAUDE.md` as the
canonical source. All 22 new tests (17 contract + 5 e2e) pass. All 47 existing tests
pass. No secrets, no debug code, no skipped tests. Two findings require attention before
merge: two skill files breach the project's own 120-line hard cap (introduced by this very
PR), and an updated Codex review artifact sits uncommitted in the working tree.

### Verdict: REQUEST_CHANGES

---

### Findings

#### [HIGH]: skills/code-review/SKILL.md and skills/security-audit/SKILL.md exceed the 120-line hard cap

**Files:** `skills/code-review/SKILL.md` (134 lines), `skills/security-audit/SKILL.md` (136 lines)

**Issue:** `docs/CLAUDE.md` Code Conventions states: "Skills stay under ~120 lines (hard cap 120 to prevent bloat)." This PR adds 6 lines to each of these two skills (instruction + blank line + template line, duplicated for two templates in architecture-decision). The result is 134 and 136 lines respectively — 14 and 16 lines over the hard cap. The violation is against a convention defined in the same PR, which makes it immediately observable and non-deferrable.

**Why it matters:** The line budget exists to prevent skill bloat. Shipping a convention that the same commit already violates signals either that the cap needs revisiting (that is a separate ticket) or that the additions need to be made more compact. Either way, the state cannot land on main as-is.

**Suggestion:** Either (a) inline the instruction text directly into the template comment line to save 2 lines per template (e.g., change the standalone instruction sentence into a comment inside the code block), (b) trim other content in each skill to stay under 120, or (c) raise a ticket to revise the skill-size convention and temporarily accept the overage with an explicit `// TODO: skill-size` comment. Option (c) should also result in updating the line-budget test to cover `code-review` and `security-audit` skills, since the existing test omits them.

---

#### [HIGH]: Uncommitted working-tree changes to review-codex-code-artifact-timestamps.md

**File:** `docs/features/artifact-timestamps/review-codex-code-artifact-timestamps.md`

**Issue:** The working tree has unstaged modifications to this Codex review artifact. The committed version contains a `REQUEST CHANGES` verdict (the Codex reviewer originally flagged that the feature's own artifacts violated the convention). The working-tree version has been updated to `APPROVE` with a fresh timestamp (`2026-04-13T02:02:20Z`) after the fix was applied — but the change was never committed. This means the branch's committed state still includes a Codex review with a `REQUEST CHANGES` recommendation, which contradicts the claim that the feature is ready to merge.

**Why it matters:** Anyone reading the branch to assess merge-readiness will see `REQUEST CHANGES` in the Codex review. The fix is already done but not recorded, which creates a false picture of the branch state.

**Suggestion:** Stage and commit the updated `review-codex-code-artifact-timestamps.md` before re-running this review. It should be a standalone commit with message: `fix: update Codex code review to APPROVE after addressing findings`.

---

#### [MEDIUM]: Line-budget test does not cover code-review and security-audit skills

**File:** `tests/node/core-skill-contracts.test.js`

**Issue:** The `core skills stay within the compact line-budget target` test covers only `prd-writing`, `architecture-decision`, `tdd`, and `verification-gate`. It does not cover `code-review` or `security-audit`, which are among the skills modified in this PR and the two that now breach the hard cap. The gap allowed the violation to go undetected by the test suite: all 47 existing tests pass despite the skills being 14–16 lines over budget.

**Why it matters:** The line-budget test exists precisely to catch this. Not covering the two skills that were modified in this PR is the exact failure mode the test was designed to prevent.

**Suggestion:** Add `'skills/code-review/SKILL.md': 120` and `'skills/security-audit/SKILL.md': 120` to the `budgets` map in the line-budget test. This will make the test fail until the size violation is also fixed, ensuring both issues are resolved together.

---

#### [NOTE]: AC4 cross-reference requirement partially met

**File:** All four skill files

**Issue:** The PRD's AC4 specifies: "the timestamp requirement is documented in `docs/CLAUDE.md` under Code Conventions as the single canonical source, **with a cross-reference from each skill template that includes the `**Generated:**` line**." The added instruction text in each skill reads "Include a `**Generated:**` line with the current ISO 8601 timestamp immediately after the top-level heading." — it restates the convention but does not point back to `docs/CLAUDE.md` as the canonical source. The architecture also says "skills and commands cross-reference it but do not redefine it," which the current text technically violates (it redefines rather than references).

**Why it matters:** Without a cross-reference, someone reading only the skill template has no signal about where the convention lives or how to look up the full details. It also slightly undermines the "single canonical source" intent since the instruction in each skill is a parallel definition that could drift. This is not blocking since the convention text is identical, but it is worth fixing in a follow-up if not immediately.

**Suggestion:** Change the instruction line in each skill from a self-contained statement to a reference: e.g., "Include a `**Generated:**` line per the artifact-timestamp convention in `docs/CLAUDE.md` Code Conventions."

---

#### [PRAISE]: Test design correctly uses structural anchors, not phrase-binding

**Files:** `tests/contracts/artifact-timestamps.test.js`, `tests/e2e/artifact-timestamps.spec.js`

The tests assert against section headings, template positions, and structural markers (`**Generated:**`, `## Code Conventions`) rather than exact prose. The `assertGeneratedAfterFirstHeading` helper enforces placement within 5 non-empty lines after the first heading, which is the right level of precision — tight enough to catch misplacement, loose enough to survive rewording. The proximity window in the AC3 regeneration tests (±300 chars around the `**Generated:**` marker) is well-calibrated. This follows the convention established in ISS-010 and avoids the phrase-binding fragility that has caused test failures in earlier pipeline iterations.

---

### Test Assessment
- [x] New code has corresponding tests (22 new tests across contracts + e2e)
- [x] Edge cases are covered (placement, proximity, full chain)
- [ ] No skipped tests introduced — confirmed clean
- [x] Tests are testing behaviour, not implementation (structural anchors)
- [ ] Line-budget test omits the two modified skills — gap identified above

### Convention Compliance
- [x] Follows project folder structure
- [x] Naming conventions respected (kebab-case, SKILL.md, etc.)
- [x] No `any` types (not applicable — JS project)
- [x] No hardcoded values
- [x] Commit messages follow format (feat/fix/docs prefixes, ISS-026 scope)
- [ ] Two skills exceed 120-line hard cap — must fix before merge
- [ ] Uncommitted review artifact — must commit before merge
