## Code Review: feature/ISS-024-014-033-review-hardening
**Generated:** 2026-04-13T23:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent | **Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

### Summary

The implementation correctly delivers the core review-hardening objectives: `source_spec` is required in the handoff schema and checkpoint validation, the code-review skill has a well-structured Reviewer Independence section, both gate roles get adversarial stance and read-only constraints, and commands are updated to load source_spec first. All 64 tests pass. However, the security audit's required-before-merge HIGH condition (path traversal validation on `source_spec`) was not implemented, and two structural asymmetries exist between the two gate commands/roles that leave AC6 partially uncovered.

### Verdict: REQUEST_CHANGES

---

### Findings

**issue (BLOCKING): Path traversal condition from security audit not implemented**

The security audit (docs/features/review-hardening/security-audit.md) issued a condition for implementation:

> "[HIGH] Path traversal: Implementation must validate `source_spec` against path traversal before any file read. Reject values containing `..`, absolute paths, or URLs outside allowed domains."

Neither `checkpoint.js` nor `schemas/handoff.schema.json` have any path traversal guard. A crafted handoff with `source_spec: "../../../etc/passwd"` or an absolute path passes `checkpoint.js` validation today. The schema has no `pattern` constraint on `source_spec`. The TRUST BOUNDARY test verifies only that the type is `string` — it does not test that traversal patterns are rejected.

The fix: add a `pattern` constraint to `schemas/handoff.schema.json` (e.g., `"^(docs/|https://github\\.com/)"`) and a matching validation block in `checkpoint.js` that rejects values containing `..` segments, leading `/`, or URLs outside the project's known domain. Add a test case with a traversal payload to the integration test suite.

---

**issue (HIGH): `commands/security-gate.md` missing the `produced_by` same-role check**

`commands/review.md` includes an explicit `produced_by` same-role halt:

> "If `produced_by` matches the current reviewer role (code-reviewer), halt..."

`commands/security-gate.md` does not. The architecture doc (section "Separate-Context Enforcement") states the mechanism applies to "Gate-phase commands (review, security-gate)" — the omission is a direct violation of that spec. AC6 requires separate context enforcement for both gate phases. No test verifies this check exists in `security-gate.md`; the test suite only validates that `security-gate.md` has the `source_spec`-first instruction and the artifact header.

The fix: add the `produced_by` check to `commands/security-gate.md`, mirroring the block in `commands/review.md` but scoped to "security-reviewer". Add a contract test to verify its presence.

---

**issue (MEDIUM): `ROLE_SECURITY.md` missing explicit separate-context requirement**

`ROLE_CODE_REVIEWER.md` has a dedicated "Separate Context Requirement" section that instructs reviewers to re-derive coverage expectations from `source_spec`, check `produced_by`, and halt on role match. `ROLE_SECURITY.md` has none of this — it has "Adversarial Stance" and "Read-Only Constraint" but no separate-context instruction.

The architecture doc (section "Gate-Review Roles") enumerates both roles as receiving "adversarial stance and read-only enforcement" but the architecture's Separate-Context section describes the `produced_by` check as applying to "Gate-phase commands (review, security-gate)". The role file is the identity layer — if the command check fails or is bypassed, the role is the last line of defence. The gap means a security reviewer gets no role-level instruction to re-derive expectations independently.

The fix: add a "Separate Context Requirement" section to `ROLE_SECURITY.md` mirroring the one in `ROLE_CODE_REVIEWER.md`, scoped to "security-reviewer". Add a contract test using the same structural anchor pattern as the AC6 test for `ROLE_CODE_REVIEWER.md`.

---

**question (MEDIUM): Architect command line limit raised from 100 to 200 with no AC traceability**

`commands/architect.md` and `.claude/commands/architect.md` both change `Output must be under 100 lines` to `Output must be under 200 lines`. This is a meaningful policy change — it doubles the permitted size of architecture documents — but no AC in the PRD, no ticket in the diff, and no commit message explains why.

The PRD's scope explicitly states this feature covers ISS-024, ISS-014, and ISS-033. The architecture doc for review-hardening itself is 97 lines, so the 100-line limit may have been hit during this feature cycle. If that is the reason, the commit message (`chore: raise architecture doc line limit from 100 to 200`) doesn't capture it, and there's no ticket tracking this policy change. A limit doubling with no documented rationale is difficult to reason about at 2am.

If this was required to unblock the architecture doc for this feature, document it in a known gotcha or open a ticket. If it was a pre-existing pain point, it deserves its own ticket and AC.

---

**issue (LOW): `source_spec` value in current `handoff.json` is not verified as resolvable by `checkpoint.js`**

`checkpoint.js` validates that `source_spec` is a non-empty string but does not check that the pointed-to file exists. The architecture doc (Failure Modes table) specifies: "`source_spec` points to nonexistent file → Review halts with explicit error message (AC16)."

The integration test happy path creates the PRD file in a temp directory before running checkpoint, confirming the test author expected file-existence checking to be present in checkpoint. But the checkpoint validation function contains no `fs.existsSync` call for `source_spec`. The halt-on-unresolvable-source-spec behavior is documented in `commands/review.md` only as a prose instruction to the agent — not as a deterministic checkpoint rejection.

This means a handoff pointing to a deleted or mistyped PRD path will pass `checkpoint.js` silently. The agent-level instruction in `commands/review.md` is a second line of defence, but the architecture specifies checkpoint as the first.

The fix: in `validateHandoff()` in `checkpoint.js`, after confirming `source_spec` is a non-empty string, check `fs.existsSync(path.resolve(process.cwd(), handoff.source_spec))` and push to errors if the path is a local file that doesn't exist. URL values can be excluded from this check (as the architecture permits URLs).

---

**praise (NIT): Structural anchor testing pattern is well-applied throughout**

The test suite consistently uses heading-level and structural anchors (`/^## Reviewer Independence$/m`, `/adversarial/i`, `/separate context/i`) rather than phrase-binding. This follows the ISS-013 convention explicitly, and the test comment on AC6 ("Structural anchor: look for the section then verify...") shows deliberate awareness of the gotcha. Tests are testing behaviour (the presence of required guidance), not implementation (exact wording). This is the right pattern for prose-driven pipeline artifacts and will survive future wording improvements.

---

**nitpick (NIT): `handoff.json` `phase` field mismatch — claims phase 5 but is committed post-implement**

The committed `handoff.json` has `"phase": 5` and `"goal": "Diff-based code review in fresh context"`, indicating this is the Phase 5 handoff to the Phase 6 reviewer. This is correct for the pipeline contract. However, `"goal"` says "Diff-based code review in fresh context" — the old description from `commands/review.md` before the description was updated to "source_spec-anchored code review in fresh context". Minor inconsistency that doesn't affect behavior but will confuse anyone reading the handoff.json during Phase 6.

---

### Test Assessment

- [x] New code has corresponding tests
- [ ] Edge cases are covered — missing: path traversal in `source_spec`, file-existence check for unresolvable `source_spec`, `produced_by` check in `security-gate.md`, separate-context requirement in `ROLE_SECURITY.md`
- [x] No skipped tests introduced
- [x] Tests are testing behaviour, not implementation

### Convention Compliance

- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No `any` types without documented reason
- [x] No hardcoded values
- [x] Commit messages follow format
