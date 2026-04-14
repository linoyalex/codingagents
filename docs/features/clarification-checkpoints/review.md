## Code Review: feature/ISS-029-specify-fidelity
**Generated:** 2026-04-13T14:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

This feature adds ticket fidelity verification and human review checkpoints to `/specify` and `/architect` by modifying two command files and extending the `prd-writing` skill. The implementation is purely instructional — no new runtime code, hooks, or dependencies are introduced. All 56 tests pass (44 contract, 7 E2E, 5 integration). The source/installed copy byte-identity constraint is enforced by tests. One test correctness bug exists in the integration suite (a logically vacuous `||` assertion that would miss a fidelity/clarification ordering regression) and the `checkpoint_pending` schema field lacks an `enum` constraint. Both are tracked in the handoff as known gaps and do not block merge.

### Verdict: APPROVE with documented follow-up

The implementation satisfies AC0–AC8 per ISS-029. The two substantive findings do not block merge — they are known, documented, and tracked. The feature also produces ISS-044 as a concrete follow-on to address scope-expansion during rework cycles, which is a well-reasoned residual risk capture.

---

### Findings

#### [PRAISE] Contract tests bind to behavior, not keywords

The contract test for AC1 (clarification triggers, `tests/contracts/clarification-checkpoints.test.js` lines ~1228–1243) requires at least 3 of 5 concrete trigger class patterns by independent regex — it cannot pass simply because the word "trigger" or "clarification" appears. The AC3 test independently asserts `unanswered.*assumption`, `dependencies`, and `proceed` as three separate behavioral requirements. The AC6 negative tests extract the text *after* the checkpoint position and check for forbidden bypass phrases rather than checking ordering alone. This is correct test methodology and meaningfully distinguishes instruction text that satisfies the AC from text that merely mentions the topic.

---

#### [HIGH] Integration test line 120: `||` renders the fidelity-before-clarification ordering assertion vacuous

**File:** `tests/integration/clarification-checkpoints.integration.test.js`, line 120 (integration test file)

```js
assert.ok(fidelityIdx < clarificationIdx || clarificationIdx < commitIdx,
  'Both fidelity and clarification must appear before commit');
```

Concrete values at HEAD: `fidelityIdx=252`, `clarificationIdx=1255`, `commitIdx=4217`. The disjunction passes whenever *either* operand is true. Since `clarificationIdx < commitIdx` (1255 < 4217) is independently asserted on the next line, and is always true given the current command structure, the left operand `fidelityIdx < clarificationIdx` adds zero enforcement — the assertion always passes regardless of whether fidelity precedes clarification. A regression that reorders the fidelity step to appear *after* the clarification gate would not be caught.

**Suggested fix:** Replace with two independent assertions with distinct messages:
```js
assert.ok(fidelityIdx < clarificationIdx,
  'Fidelity step must come before clarification gate');
assert.ok(clarificationIdx < commitIdx,
  'Clarification gate must come before commit');
```

This is a test correctness bug logged per the handoff instructions. The command currently has the correct ordering (fidelity at position 252, clarification at 1255), so no regression exists today — but the test would not catch one. Documented as known gap; not blocking merge.

---

#### [MEDIUM] `schemas/handoff.schema.json`: `checkpoint_pending` description specifies two allowed values but schema enforces no `enum` constraint

**File:** `schemas/handoff.schema.json`, lines 67–70

The description states: *"Values: 'clarification' (specify gate) or 'architecture-review' (architect gate)."* The description treats this as an exhaustive enumeration. However, the schema declares `"type": "string"` with no `enum` constraint, so any string passes schema validation silently. A command file with a typo (e.g., `"arch-review"` instead of `"architecture-review"`) would not be caught by the schema validator, and `restore-context.js` would not surface the checkpoint correctly on session resume.

The fix is straightforward:
```json
"checkpoint_pending": {
  "type": "string",
  "enum": ["clarification", "architecture-review"],
  "description": "..."
}
```

Tracked in handoff as a follow-up for ISS-044. Not blocking merge.

---

#### [LOW] No structural test verifies that `checkpoint_pending` is *cleared* when the checkpoint resolves

**File:** `tests/contracts/clarification-checkpoints.test.js`

AC6 requires that the command not silently advance without user response. The architecture specifies that `checkpoint_pending` must be cleared when the checkpoint is resolved. Both command files contain clearing instructions ("clear `checkpoint_pending`"), and the tests verify the field exists in the schema. However, no structural test asserts that the clearing instruction is present in the command text. If that instruction were removed, no test would fail.

This is an acknowledged design constraint — the feature is instructional and clearing behavior cannot be verified by structural tests alone. Acceptable given the architecture's deliberate choice to avoid programmatic enforcement. Worth revisiting if ISS-044 adds schema validation at the hook level.

---

#### [LOW] `produced_by: "code-reviewer"` in handoff.json surface anomaly (documentation only)

**File:** `.claude/handoff.json`

The handoff at HEAD was produced by the code-reviewer agent pointing to phase-7 goals, which is correct content. However, `resolve-feature.js` raised a warning ("handoff phase is 6, expected 5 before Phase 6") because the handoff was already at phase 6 when this review session started — the prior review session had already advanced it. The pipeline continues correctly because an explicit feature slug was supplied. No action required; informational only.

---

### Test Assessment

- [x] New code has corresponding tests — 56 tests: 44 contract, 7 E2E, 5 integration
- [x] Edge cases are covered — ticket-not-found, partial/refused answers, session resumption, no-ticket-reference empty state, checkpoint asymmetry (specify proceeds, architect blocks)
- [x] No skipped tests introduced — confirmed zero `.skip`, `xtest`, or `xit` in test files via diff grep
- [x] Tests are testing behaviour, not implementation — structural anchor patterns, negative-pattern forbidden phrase checks, and ordering position assertions; not line numbers or internal variables

One test correctness deficiency: the `||` assertion in the integration test (HIGH finding above). Current command ordering is correct, so no false pass exists today, but the test would not catch an ordering regression.

---

### Convention Compliance

- [x] Follows project folder structure — `commands/`, `.claude/commands/`, `skills/`, `.claude/skills/`, `tests/contracts/`, `tests/e2e/`, `tests/integration/` all used per convention
- [x] Naming conventions respected — file names follow existing patterns
- [x] No `any` types — no TypeScript in this diff; pure JavaScript test files
- [x] No hardcoded values — test regex patterns bind to behavioral properties, not line numbers
- [x] Commit messages follow format — `feat:`, `refactor:`, `test:`, `security:`, `chore:` prefixes used correctly
- [x] Source/installed copies byte-identical — confirmed by sync tests passing
- [x] Skill size budget — `skills/prd-writing/SKILL.md` is 135 prose lines (well under 250 total limit)
- [x] `Generated:` timestamps present — prd.md, architecture.md, security-audit.md all include required timestamps
- [x] `additionalProperties: false` maintained on schema — confirmed in `schemas/handoff.schema.json`

### AC Coverage vs. ISS-029

| AC | Ticket requirement | Implemented | Test coverage |
|----|-------------------|-------------|---------------|
| AC0 | Transcribe ticket ACs faithfully | Ticket Fidelity Procedure in skill (Step 2) | Contract + E2E |
| AC0a | Verify convention citations against CLAUDE.md | Skill Step 4 | Contract |
| AC0b | Internal contradiction check | Skill Step 5 | Contract |
| AC0c | Open-ended scope enumeration or ask | Skill Step 6 | Contract |
| AC1 | Clarification gate with triggers | specify.md Step 2 | Contract + E2E |
| AC2 | Question discipline (material only) | "material questions only" instruction | Contract |
| AC3 | Partial/refused answer handling | "record as assumption, proceed" | Contract |
| AC4 | Architect review checkpoint | architect.md Review Checkpoint section | Contract + E2E |
| AC5 | Multiple revision cycles | "Multiple revision cycles are allowed" | Contract |
| AC6 | No hidden auto-advance | Structural ordering + negative pattern tests | Contract |
| AC7 | Workflow signaling | "still in review" language | Contract |
| AC8 | Structural verification | Three sub-checks (a, b, c) | Contract |

All ACs satisfied. No ACs from the ticket are missing or weakened in the implementation.
