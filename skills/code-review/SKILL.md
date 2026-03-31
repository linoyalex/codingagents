---
name: code-review
description: Diff-based code review methodology with structured findings and verdict format
version: "1.0.0"
---

# Skill: Code Review

## Review Methodology (follow in order)

1. **Understand intent** — read the PR description and linked spec/ticket first
2. **Check big picture** — does the approach match the architecture? Any structural concerns?
3. **Check tests** — are the right things tested? Are edge cases covered?
4. **Review implementation** — read the diff for correctness, clarity, and convention compliance
5. **Check integration** — does it work with the rest of the system? Any breaking changes?

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

## Finding Classification

| Severity | Meaning | Action |
|----------|---------|--------|
| **BLOCKING** | Bug, security issue, or data loss risk | Must fix before merge |
| **HIGH** | Significant design concern or missing test | Should fix before merge |
| **MEDIUM** | Code quality, naming, or convention issue | Fix if straightforward |
| **LOW** | Stylistic preference or minor improvement | Optional |
| **NIT** | Trivial observation | No action needed |

## Review Document Template

```markdown
## Code Review: [Branch Name]
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

## Review Rules

- **Read-only** — flag issues, do not fix them. The developer fixes.
- **Never rubber-stamp** — if the code looks correct, say why it looks correct
- **Be specific** — "this could be better" is not feedback; "this function handles 3 concerns and should be split" is
- **Separate style from substance** — blocking on naming conventions wastes time; blocking on missing auth checks saves the product
- **Fresh context only** — never review code you wrote in the same session
