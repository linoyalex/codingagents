# Review: skill-reliability-refresh (Claude, adversarial)

**Date:** 2026-04-07 | **Reviewer:** Claude (adversarial pass)
**Diff:** `git diff HEAD skills/ commands/ tests/node/core-skill-contracts.test.js`
**Scope:** ISS-010 implementation by Codex + the three Codex self-reviews in this feature directory.

---

## Summary

This change ships 4 core skills + 4 paired commands + 1 new test file. The Codex architecture, code, and test-design reviews all return "no blocking findings, LOW nit, proceed/APPROVE". That rubber-stamp pattern is itself a finding — three sibling reviews producing a one-LOW-nit verdict on a ~345-line, multi-artifact, cross-cutting framework change is not credible review signal. When I read the actual diff against the PRD's stated goals, the implementation **materially violates AC8 ("signal density without prompt sprawl")**, the project's own "skills under ~100 lines" convention, and the intent of AD4 ("deterministic contract coverage"). The test file in particular is testing literal phrases rather than behavior, which is the exact "tests validate presence of instructions rather than behavioral invariants" failure mode that motivated ISS-001. Several of the new additions *are* genuinely good ideas (decision confidence, revisit/rollback, stop conditions as a concept) — the problem is how they were implemented, not whether they belong.

## Verdict: REQUEST_CHANGES

---

## Findings

### [BLOCKING] Tests assert exact phrases, not behavior — freezes wording in amber and rewards stagnation

**File:** `tests/node/core-skill-contracts.test.js:12-62`

**Issue:** Every assertion in this file is a literal phrase match:

```js
assert.match(source, /state the intended RED failure reason in one sentence/i);
assert.match(source, /general solution for valid inputs/i);
assert.match(architect, /decision confidence, revisit trigger, rollback\/fallback, and trust boundaries/i);
```

This means:
1. If a future maintainer rewrites the guidance to be **clearer** using different words, the test fails. The test punishes refinement.
2. The test does not verify that agents actually follow the guidance, that the guidance produces better outputs, or that the rule is even coherent — only that the specific string exists somewhere in the file.
3. This is the exact antipattern ISS-001 was opened to prevent: *"tests that validate presence of instructions rather than behavioral invariants"*. ISS-010 was merged while ISS-001 is still open in the backlog. The two tickets are now in direct contradiction.
4. The test file also *only* checks `skills/` (source copies) — it does not check `.claude/skills/` (installed copies), so nothing prevents drift between source and installed once a consumer runs `upgrade.sh`.

**Suggestion:** Either (a) delete the file and replace it with a behavioral test that loads a skill, runs it against a fixture input, and asserts on the output's structural properties, OR (b) if text-level protection is genuinely the goal, assert on **stable structural anchors** (heading names, table column headers, template field labels) rather than instructional prose. A test that asserts `assert.match(source, /^## Stop Conditions$/m)` survives wording refinement; a test that asserts the exact sentence does not. Either way, add assertions against `.claude/skills/` to catch source/install drift.

---

### [BLOCKING] Change directly violates AC8 and the repo's own "skills under ~100 lines" rule

**File:** all four core skills

**Issue:** The PRD's AC8 states: *"the new guidance improves signal density without meaningfully increasing prompt sprawl or overlapping rules"*. The architecture's AD2 says: *"Prefer fewer, sharper instructions over adding broad new prose."* `docs/CLAUDE.md` code conventions state: *"Skills stay under ~100 lines"*.

Actual line counts after this change:
| Skill | Lines | Over budget by |
|-------|-------|----------------|
| `prd-writing` | 132 | +32% |
| `architecture-decision` | 170 | +70% |
| `tdd` | 150 | +50% |
| `verification-gate` | 240 | +140% |

Net diff: **+299 lines** across 4 skills (345 insertions, 46 deletions). Every single core skill now exceeds the documented budget, the worst by more than 2x. The PRD explicitly warned against this outcome. The architect's AD2 explicitly warned against this outcome. It shipped anyway.

**Suggestion:** Before re-reviewing, cut each skill back to ≤120 lines. The way to do that honestly is to remove the duplicated "Success Criteria / Allowed Inputs / Deliverables / Stop Conditions" header scaffold (see next finding) from skills where it is boilerplate, and keep it only where it delivers real per-skill value.

---

### [HIGH] The new 4-section header is a templated preamble, not "sharper guidance"

**File:** all four skills, top ~25 lines of each

**Issue:** Every refreshed skill now opens with an identical structure:

```markdown
## Success Criteria
...
## Allowed Inputs
...
## Deliverables
...
## Stop Conditions
...
```

Compare the "Stop Conditions" across skills — the *structure* is identical and the *content* is near-identical patter ("the input is ambiguous", "the artifact is stale", "you cannot name the behavior in one sentence"). This is a templated preamble, not per-skill reliability guidance. Prompt-engineering research (Anthropic's own prompt caching docs, the chain-of-thought literature, Simon Willison's prompt-engineering writing) consistently shows that **one strong, specific instruction at the top beats four structured preamble sections** — because agents scanning a long skill under context pressure skip structured preambles as boilerplate. The PRD's AC2 specifically asked for "front-loading the highest-leverage guidance", not "adding a uniform 25-line header to every skill".

**Suggestion:** Keep the *concept* of Stop Conditions (it's the strongest new idea in this PR). But express it per-skill, not as a templated section. For `tdd`, the single highest-leverage instruction is: *"If RED fails for the wrong reason, stop. Do not write GREEN code on top of a false-positive failure."* That belongs in the first 3 lines, not buried at line 28 under a header structure shared with three other skills. Delete the template. Write one sharp sentence per skill.

---

### [HIGH] "Happy, edge, adversarial" is a slogan without a procedure

**File:** `skills/tdd/SKILL.md:42,46` and `commands/implement.md:32`

**Issue:** The new rule "Before GREEN, name 3 concrete cases from the spec or handoff: happy, edge, adversarial" is a catchphrase with no procedure behind it. There is:
- No definition of "adversarial" in a TDD context (is it hostile input? misuse? boundary exploitation? injection? all four?)
- No worked example showing what good adversarial case selection looks like
- No guidance on what to do if the spec has no adversarial dimension (e.g. a pure refactor)
- No test or check that the agent actually did this

Under context pressure, an agent told to "name an adversarial case" will check the box with a shallow "what if the input is null" — exactly the shallow edge case the skill's own "Edge cases: empty input, null..." line already covers. The rule therefore adds ceremony without changing behavior.

**Suggestion:** Either drop the word "adversarial" (happy + edge is enough and is well-defined) OR add a 3-line worked example: *"Example: for a password reset endpoint — happy: valid token resets password. Edge: token expired at second boundary. Adversarial: token for user A used to reset user B's password."* One concrete example teaches more than three vague bullet points.

---

### [HIGH] Source and installed copies are both edited with no sync enforcement

**File:** `skills/*/SKILL.md` (source) and `.claude/skills/*/SKILL.md` (installed)

**Issue:** The diff shows **both** `skills/*/SKILL.md` and `.claude/skills/*/SKILL.md` being modified in this change. They are currently byte-identical (I checked via `diff -q`), but:
1. Nothing in the repo enforces that sync. There is no pre-commit hook, no CI check, no generator.
2. The new test file only asserts against `skills/` — not `.claude/skills/`.
3. This PR essentially doubled the change surface and doubled the chance of future drift. The next maintainer who edits one and forgets the other will silently ship a stale installed copy to consumers via `init.sh` / `upgrade.sh`.
4. The dogfood-pipeline feature (ISS-005) introduced this dual-tree setup deliberately, but it did not introduce a sync gate — that's a known liability, and this PR walks straight into it.

**Suggestion:** At minimum, the test file must also assert that each `.claude/skills/*/SKILL.md` is byte-identical to its `skills/*/SKILL.md` counterpart. Better: add a pre-commit or CI check that fails on drift. Best: generate `.claude/skills/` from `skills/` via `init.sh`/`upgrade.sh` and remove the committed installed copies from the dogfood repo entirely (this is an ISS-005 follow-up).

---

### [MEDIUM] Verification-gate regressed on stack portability

**File:** `skills/verification-gate/SKILL.md:70-74,99-102`

**Issue:** The original Phase 3 check was `npm test 2>&1 | tail -10` with comment "adapt to your stack". The new version hardcodes `npm test -- tests/contracts/<feature>.test.ts tests/e2e/<feature>.spec.ts` — a specific npm + TypeScript layout. But **this very repo uses `node --test tests/node/*.test.js`**. The new guidance does not match the repo that wrote it. This is the opposite of "feature-scoped deterministic checks" — it's "npm-specific deterministic checks". The Codex architecture review flagged this as a LOW concern and moved on; it should be HIGH, because it will mislead agents running in this repo today.

**Suggestion:** Parameterize the example with a placeholder comment: `# Feature-scoped test command (adapt to your stack: node --test tests/node/<feature>*.test.js, pytest tests/<feature>, etc.)`. Or split into a small table of stack-specific examples. Do not hardcode npm.

---

### [MEDIUM] The three Codex sibling reviews are rubber stamps — a review-process red flag

**Files:** `review-codex-architecture-*.md`, `review-codex-code-*.md`, `review-codex-tests-*.md`

**Issue:** All three Codex reviews return the same shape: *"no blocking findings, one LOW-severity nit, proceed/APPROVE"*. For a cross-cutting change touching 4 skills, 4 commands, and a new test file, in a framework whose whole point is phase-gated review discipline, three independent reviewers producing one shared LOW finding is not a credible signal — it's a reviewer who did not load the PRD's AC8 constraint, did not measure the actual line-count delta against the stated goal, did not check whether the tests verify behavior, and did not compare the new guidance against the repo's own `docs/CLAUDE.md` conventions. This pattern is evidence for ISS-001 (invariants-audit skill) — the review layer is not catching cross-layer contradictions (PRD says "don't bloat" → implementation doubles several files → reviewer says "proceed").

**Suggestion:** Not a code fix — a process fix. Before re-running this review, the author should run the new change set against the acceptance criteria in the PRD line-by-line and document the measured outcome for AC8 (line-count delta, signal density argument) rather than asserting compliance in prose.

---

### [PRAISE] The concept of stop conditions and revisit/rollback fields is genuinely valuable

The single strongest idea in this PR is making ambiguity-handling explicit — stop conditions, "if X is stale/malformed, halt and repair", and the architecture-decision revisit/rollback/confidence fields. These are real reliability gains that the skills genuinely lacked. The problem is the **implementation** (bloat, templated preamble, fragile tests), not the **idea**. A sharper version of this PR — stop conditions as one sentence per skill, revisit/rollback as optional fields not forced into every feature ADR, structural tests instead of phrase tests — would be an unambiguous improvement. Keep the concepts; cut the ceremony.

---

## Test Assessment

- [x] New code has corresponding tests — technically yes, but see BLOCKING #1
- [ ] Edge cases are covered — no; tests only verify string presence
- [x] No skipped tests introduced
- [ ] Tests are testing behaviour, not implementation — **no**; they test literal phrases (this is the inverse of the usual rule, since "implementation" here means "guidance text" — the tests bind the text, not the behavior the text produces)
- [ ] Tests protect against source/install drift — no

## Convention Compliance

- [ ] Follows project folder structure — yes
- [x] Naming conventions respected
- [ ] Skills stay under ~100 lines (docs/CLAUDE.md rule) — **violated in all 4 core skills**, worst case 240 lines
- [x] No hardcoded secrets
- [x] Commit messages follow format (based on branch state)

## Comparison vs. Codex reviews

| Concern | Codex architecture review | Codex code review | Codex test review | This review |
|---------|---------------------------|-------------------|-------------------|-------------|
| AC8 line-count compliance | Not mentioned | Not mentioned | Not mentioned | BLOCKING |
| Skill ≤100 line convention | Not mentioned | Not mentioned | Not mentioned | BLOCKING |
| Tests assert phrases, not behavior | Not mentioned | Not mentioned | Marked LOW and dismissed | BLOCKING |
| Source/install drift risk | Not mentioned | Not mentioned | Not mentioned | HIGH |
| Stack portability regression | Marked LOW | Not mentioned | Not mentioned | MEDIUM (arguably HIGH) |
| Templated preamble dilutes front-loading | Not mentioned | Not mentioned | Not mentioned | HIGH |
| Rubber-stamp review pattern | N/A (self) | N/A (self) | N/A (self) | MEDIUM |

The delta is not "Claude is harsher than Codex" — it is "Codex did not measure the PR against the PRD's own acceptance criteria, and Claude did". Every BLOCKING finding above is derivable from reading the PRD and running `wc -l`. The Codex reviews appear to have been written from the change set alone, without cross-checking against the feature's own stated constraints.

---

## Required Before Re-Review

1. Cut each core skill back to ≤120 lines. Delete the templated 4-section preamble where it is boilerplate. Keep one sharp stop-condition sentence per skill at the top.
2. Replace `tests/node/core-skill-contracts.test.js` with structural assertions (heading presence, template field labels) or delete it and write a behavioral test. Add source/installed-copy drift assertions.
3. Add a worked example for the "happy, edge, adversarial" rule or drop "adversarial".
4. De-hardcode the npm-specific verification commands, or note the repo's own `node --test` invocation in the example.
5. Document the measured outcome against AC8 in the re-review (actual line-count delta, why that delta is signal-positive).

## Follow-Ups to File Separately

- ISS-010-followup: generate `.claude/skills/` from `skills/` at install time instead of committing both copies (removes entire drift class).
- ISS-001 is now overdue — this PR is exhibit A for why invariants-audit as a dedicated skill is needed.
- The Codex reviewer prompts should be updated to require PRD cross-reference ("for each AC, cite the evidence it is met") — Codex did not do this on its own.

---

## Rework Addendum (2026-04-08)

**Branch:** `rework/ISS-010-skill-reliability`

### Findings assessment vs committed code

The review was written against an intermediate draft. The committed code (d4fb1dc) already addressed several findings. Here is the status of each finding after the rework:

| # | Finding | Status after rework | Notes |
|---|---------|-------------------|-------|
| 1 | [BLOCKING] Tests assert exact phrases | **RESOLVED** | Skill tests already used structural anchors (heading names, template fields). Paired commands test rewritten to use concept-level regex (`/confidence/i`, `/misuse\|abuse/i`) instead of exact phrases. Drift test was already present. |
| 2 | [BLOCKING] Skills exceed 100 lines | **ALREADY RESOLVED in original commit** | Actual line counts: prd-writing=100, architecture-decision=112, tdd=78, verification-gate=119. All under the ≤120 target. Review cited draft counts (132–240) that were trimmed before commit. |
| 3 | [HIGH] Templated 4-section preamble | **ALREADY RESOLVED in original commit** | Skills use concise per-skill "## Top Rules" (3–5 lines each), not the templated "Success Criteria / Allowed Inputs / Deliverables / Stop Conditions" structure described in the review. |
| 4 | [HIGH] "Adversarial" lacks definition | **ALREADY RESOLVED in original commit** | Renamed to "misuse or abuse case when relevant" with worked example (tdd skill lines 28–31: happy/edge/misuse-abuse for password reset). |
| 5 | [HIGH] Source/installed drift | **RESOLVED** | Source `commands/implement.md` synced from installed copy. All 4 skills + 4 commands now byte-identical (verified by drift test). |
| 6 | [MEDIUM] Stack portability regression | **ALREADY RESOLVED in original commit** | Verification-gate says "Examples only — adapt to your stack" and phase-specific checks include both `node --test` and `npm test` examples with "Adapt to your stack" comments. |
| 7 | [MEDIUM] Rubber-stamp Codex reviews | Process issue — not a code fix. Tracked separately via ISS-014 (adversarial reviewers). |

### AC8 compliance (line-count delta)

| Skill | Before ISS-010 | After ISS-010 | Delta |
|-------|---------------|--------------|-------|
| prd-writing | 101 | 100 | -1 |
| architecture-decision | 123 | 112 | -11 |
| tdd | 121 | 78 | -43 |
| verification-gate | 208 | 119 | -89 |
| **Total** | **553** | **409** | **-144** |

Signal density increased while total lines decreased by 26%. AC8 is met.

### Test results

All 35 tests pass, including:
- Line-budget enforcement (≤120 per skill)
- Structural reliability anchors (heading names, template fields)
- Concept-level command alignment (flexible regex, not phrase-bound)
- Source/installed byte-identity drift check
