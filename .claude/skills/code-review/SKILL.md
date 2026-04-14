---
name: code-review
description: Diff-based code review methodology with structured findings and verdict format
version: "1.1.0"
---

# Skill: Code Review

## Review Methodology (follow in order)

1. **Understand intent** — read the PR description and linked spec/ticket first
2. **Check big picture** — does the approach match the architecture? Any structural concerns?
3. **Check tests** — are the right things tested? Are edge cases covered?
4. **Review implementation** — read the diff for correctness, clarity, and convention compliance
5. **Trace downstream impact** — if the diff touches schema files, trace producers and consumers. [See reference: .claude/skills/code-review/impact-analysis.md]
6. **Check integration** — does it work with the rest of the system? Any breaking changes?

## Reading the Diff

**Token discipline:** Read `git diff main...HEAD` only. Do NOT open every file in changed modules.

If a finding requires understanding surrounding context, read that ONE file — not the whole module.

```bash
# Get the diff
git diff main...HEAD

# Get list of changed files
git diff main...HEAD --name-only

# Get diff stats
git diff main...HEAD --stat
```

## Quick Automated Checks

Run these before reading the diff:

```bash
# Check for leftover console.log / debug statements
git diff main...HEAD | grep -n "console\.log\|debugger\|TODO.*HACK"

# Check for .skip / xtest in test files
git diff main...HEAD | grep -n "\.skip\|xtest\|xit\b"

# Check for any type bypasses
git diff main...HEAD | grep -n "as any\|: any"
```

## Source/Installed Drift Check

Verify source and installed copies are in sync for any `commands/`, `skills/`, or `hooks/` files in the diff. [See reference: .claude/skills/code-review/automated-checks.md]

## Test Suite Execution

Run test suites covering files touched by the diff. Report pass/fail. [See reference: .claude/skills/code-review/automated-checks.md]

## Finding Classification

| Severity | Meaning | Action |
|----------|---------|--------|
| **BLOCKING** | Bug, security issue, or data loss risk | Must fix before merge |
| **HIGH** | Significant design concern or missing test | Should fix before merge |
| **MEDIUM** | Code quality, naming, or convention issue | Fix if straightforward |
| **LOW** | Stylistic preference or minor improvement | Optional |
| **NIT** | Trivial observation | No action needed |

## Reproduction Requirement

Before finalizing any BLOCKING or HIGH finding, reproduce it with actual commands and document the evidence. [See reference: .claude/skills/code-review/reproduction.md]

## Conventional Comments Format

Use this structured format for all findings. It is machine-parseable and enables tracking patterns across reviews.

```
<label> (<severity>): <subject>

<discussion>
```

Labels:
- `issue` — a problem that must be addressed (pairs with BLOCKING/HIGH)
- `suggestion` — a recommended improvement (pairs with MEDIUM/LOW)
- `nitpick` — trivial style preference (pairs with NIT)
- `question` — something unclear that needs explanation, not necessarily a problem
- `praise` — something done well worth calling out (reinforces good patterns)

Example:
```
issue (BLOCKING): Missing auth check on DELETE endpoint

File: src/api/closets.ts:45
The DELETE handler accepts any authenticated user but doesn't verify ownership.
A user could delete another user's closet by guessing the ID.
Recommendation: Add `verifyOwnership(userId, closetId)` before the delete call.
```

## Output Discipline

- **Cap findings at 7 maximum** — prioritise by severity. Research shows developers stop reading after the first several comments; more than 7 dilutes the signal.
- Of those 7: include at most 5 issues/suggestions and at least 1 praise (if warranted). Acknowledging good work makes critical feedback more actionable.
- If more than 7 issues exist, mention the count and focus on the highest-severity ones: "12 findings total; showing the 7 highest priority."

## Review Document Template

Include a `**Generated:**` timestamp line per the artifact timestamp convention in `CLAUDE.md`.

```markdown
## Code Review: [Branch Name]
**Generated:** <ISO 8601 timestamp>
**Date:** YYYY-MM-DD | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary
[1-2 sentence assessment of the changes]

### Verdict: APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION

### Findings

#### [SEVERITY]: [Finding title]
**File:** [path:line]
**Issue:** [What's wrong]
**Suggestion:** [How to fix it]

### Test Assessment
- [ ] New code has corresponding tests
- [ ] Edge cases are covered
- [ ] No skipped tests introduced
- [ ] Tests are testing behaviour, not implementation

### Convention Compliance
- [ ] Follows project folder structure
- [ ] Naming conventions respected
- [ ] No `any` types without documented reason
- [ ] No hardcoded values
- [ ] Commit messages follow format
```

## Reviewer Independence

The reviewer must form their own expectations before reading the diff or developer summary.

1. **Read the source spec first** — open the PRD or source_spec from the handoff before reading any diff or developer claims. Form your own mental model of what the implementation should do.
2. **Treat developer claims as hypotheses to falsify** — the handoff summary is not trusted input. Verify each claim against the source spec and the diff independently.
3. **Trace fields through the schema → validate → transform chain** — for any new or changed data field, follow it from schema definition through validation logic to every consumer. Check that constraints are enforced at each boundary.
4. **Grep adjacent symbols** — when reviewing a changed function, search for its callers and callees. Bugs often hide in unchanged code that interacts with changed code.
5. **Cross-read PRD vs implementation** — compare what the PRD requires against what the diff delivers. Note any gaps, additions, or deviations.
6. **Verify test fixtures match production schemas** — confirm that test data shapes match the real types, not simplified stand-ins.

## Review Rules

- **Read-only** — flag issues, do not fix them. The developer fixes.
- **Never rubber-stamp** — if the code looks correct, say why it looks correct
- **Be specific** — "this could be better" is not feedback; "this function handles 3 concerns and should be split" is
- **Separate style from substance** — blocking on naming conventions wastes time; blocking on missing auth checks saves the product
- **Fresh context only** — never review code you wrote in the same session

## Symmetric Gate Enforcement

When verifying a gate-phase check (e.g., `produced_by`, `source_spec`, `separate context`), confirm the same check exists in both `commands/review.md` and `commands/security-gate.md`. If one gate has a check the other lacks, raise a HIGH finding.

---
**STOP CONDITIONS (end of file):**
- Do not rubber-stamp — if the code looks correct, say why it looks correct.
- Do not merge if any BLOCKING finding remains unresolved.
- Never review code you wrote in the same session.
- Read-only: flag issues, do not fix them.
