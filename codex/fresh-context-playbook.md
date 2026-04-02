# Codex Fresh-Context Playbook

## Goal

Run Codex agents with fresh context while passing only the information that matters, to reduce token usage and improve review quality.

## 1) Use branch-scoped diffs as the primary context

Instead of pasting large docs into prompts, pass:
- Base branch: `main`
- Diff scope: `main..HEAD`
- Touched files only

Recommended prep commands:

```bash
git diff --name-only main..HEAD
git diff --stat main..HEAD
```

## 2) Pass a compact brief, not a long narrative

Use `codex/templates/review-brief.json` to structure the input.

Keep it to:
- objective
- exact files
- acceptance criteria
- verification commands

Avoid:
- full PRD dumps
- long historical logs
- unrelated architecture sections

## 3) Context budget pattern

For each fresh agent run:
- 60%: changed code and tests
- 25%: minimal product/ADR constraints
- 15%: security/review notes only if directly relevant

## 4) Use handoff.json for context (when available)

If `.claude/handoff.json` exists from a prior pipeline phase, use it for:
- acceptance criteria IDs
- known risks
- relevant file list

Do not treat handoff.json as the full context — it's a pointer, not a narrative.

## 5) Suggested prompts

### A) Fresh code review run

```text
Use codex/reviewers/review-code.md.
Review git diff main...HEAD with findings-first output.
Prioritize correctness, security, and missing tests.
Use file:line evidence and give a merge recommendation.
If .claude/handoff.json exists, use it only for AC and risk context.
Write the result to codex/reviews/review-code-[feature].md.
```

### B) Fresh test-design review

```text
Use codex/reviewers/review-test-design.md.
Review tests/contracts/ and tests/e2e/ against docs/prd.md.
Map each finding to an AC. Prioritize missing boundary and negative cases.
Write the result to codex/reviews/review-test-design-[feature].md.
```

### C) Fresh architecture review

```text
Use codex/reviewers/review-architecture.md.
Review docs/architecture/ARCH-[feature].md against docs/prd.md.
Focus on unjustified complexity, missing failure modes, and dependency risks.
Write the result to codex/reviews/review-architecture-[feature].md.
```

## 6) Keep token use low in practice

- Prefer file paths over pasted content.
- Ask agent to "read these files only first" before exploring.
- Use short acceptance criteria with IDs (AC-1, AC-2...).
- Avoid multi-feature prompts; run one feature per fresh agent.
- Reuse templates; avoid rewriting context each run.

## 7) Hand-off format between agents

Use `.claude/handoff.json` (written by the pipeline) or this compact text structure:

1. Completed:
2. Files changed:
3. Tests run:
4. Open risks:
5. Next agent starting point:

This avoids replaying full history in the next run.

## 8) After each Codex run

Log token usage:

```bash
# Args: <feature> <phase> <agent> <model> <input_tokens> <output_tokens> <duration_seconds> <verification_passed>
./codex/log-usage.sh user-auth review-code codex-review-code o3 4200 900 145 true
```

Then inspect totals:

```bash
./codex/report-usage.sh user-auth
```
