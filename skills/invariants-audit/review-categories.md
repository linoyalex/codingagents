# Invariants Audit: Review Categories

**Purpose:** Detailed patterns and signals for each of the 5 review categories.
**Boundary:** This file covers category-level patterns only. Methodology (5-step method),
trigger conditions, and stop conditions belong in SKILL.md.
**Split when:** this file exceeds ~80 lines or non-category content is added.

---

## Category 1: State-Machine and Transition Bugs

**What to look for:**
- State transitions that are defined in the spec but have no corresponding guard in code.
- Code that allows reaching a terminal state from an invalid predecessor state.
- Missing "from any state" handling for cancel, timeout, or error events.

**Signals:** State enum in schema but no transition validation in handler; tests that only
enter states via the happy path; missing tests for illegal transitions.

---

## Category 2: Blocked / Rejected / Retry / Stale-State Paths

**What to look for:**
- Blocked or rejected paths that are specified in the AC but absent from the implementation.
- Retry logic that resets state without clearing stale data from a previous attempt.
- Stale-state reads after a rejection that were never invalidated.

**Signals:** AC names a "rejected" or "blocked" outcome; no test covers the rejected branch;
retry increments a counter but does not clear prior-attempt artifacts.

---

## Category 3: Spec vs Implementation vs Tests vs Hooks Contradictions

**What to look for:**
- An AC defines a constraint; the implementation relaxes or skips it; the test passes anyway
  because it was written against the implementation, not the spec.
- A hook enforces a rule the spec does not mention, or vice versa.
- A schema field is required in the spec but optional in the validator.

**Signals:** Test assertions that mirror implementation behavior rather than AC language;
hooks that exit non-zero for conditions not listed in the spec.

---

## Category 4: Fixture-Template-Validator Mismatches

**What to look for:**
- A test fixture uses a shape that no longer matches the production template or schema.
- A validator allows values the fixture hard-codes but the template forbids.
- A fixture was written before a schema change and was never updated.

**Signals:** Fixture field names differ from schema field names; fixture passes validation
despite containing values outside the allowed enum; template has a required field missing
from the fixture.

---

## Category 5: Tests That Prove Syntax or Structure but Not Behavior

**What to look for:**
- A test asserts a heading exists, a file is present, or a field is non-null — but does not
  assert what the system does with those inputs.
- A test name claims behavioral coverage ("rejects invalid handoff") but the assertion only
  checks that the function ran without throwing.
- Structural checks that would pass even if the core behavior were removed.

**Signals:** Assertions like `assert.ok(result)`, `assert.match(content, /keyword/)` without
verifying the keyword's effect; tests that pass when the function is replaced with a no-op.
