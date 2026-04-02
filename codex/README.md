# Codex Review Layer

This directory contains the Codex-side review lane for `codingagents`.

Codex does not run the main pipeline. It provides an optional, non-blocking second review pass over the highest-value artifacts produced by the Claude pipeline.

## What Is Included

- `reviewers/`
  - Review instructions for PRD, architecture, test design, and code review
- `templates/review-brief.json`
  - Compact input packet template for a single Codex review run
- `templates/review-output.md`
  - Standard output shape for findings-first review results
- `log-usage.sh`
  - Append a Codex run to `.claude/token-usage.jsonl`
- `report-usage.sh`
  - Summarize tracked token usage by feature, phase, and iteration
- `reviews/`
  - Output location for generated review artifacts
- `fresh-context-playbook.md`
  - Guidance for low-token Codex runs

## Kickoff Order

Start with `review-code` only.

1. Run Codex against `git diff main...HEAD`
2. Save findings to `codex/reviews/review-code-[feature].md`
3. Log usage with `codex/log-usage.sh`
4. Review totals with `codex/report-usage.sh`
5. Add `review-test-design`, then `review-architecture`, then `review-prd` only after the earlier checkpoints prove useful

## Review Files

- `review-code.md`
  - Highest-value checkpoint
  - Reads diff first, not the full codebase
- `review-test-design.md`
  - Checks AC coverage and missing negative or boundary cases
- `review-architecture.md`
  - Challenges structural risk and complexity
- `review-prd.md`
  - Finds ambiguity, UX gaps, and missing ACs

## Running A Code Review

Use `codex/templates/review-brief.json` as the compact packet.

Recommended prompt:

```text
Use codex/reviewers/review-code.md.
Review git diff main...HEAD with findings-first output.
Prioritize correctness, security, and missing tests.
Use file:line evidence and give a merge recommendation.
If .claude/handoff.json exists, use it only for AC and risk context.
Write the result to codex/reviews/review-code-[feature].md.
```

## Logging Usage

After a Codex run, append usage to the shared token log:

```bash
./codex/log-usage.sh user-profile-redesign review-code codex-review-code o3 4200 900 145 true
```

Arguments:

1. `feature`
2. `phase`
3. `agent`
4. `model`
5. `input_tokens`
6. `output_tokens`
7. `duration_seconds`
8. `verification_passed`
9. Optional: `cycle`
10. Optional: `token_source`

The script writes to `.claude/token-usage.jsonl` and auto-increments `iteration` for the same feature and phase.

## Reporting Usage

Summarize all tracked features:

```bash
./codex/report-usage.sh
```

Summarize one feature:

```bash
./codex/report-usage.sh user-profile-redesign
```

The report reads `.claude/token-usage.jsonl` and compares entries against the token budget tables in `CLAUDE.md` and `PIPELINE.md` when available.

## Design Rules

- Codex reviews are advisory, not gated
- Fresh context per review
- One artifact per run
- Findings first
- Keep injected findings under 500 tokens if they flow back into the Claude pipeline
- Do not build a parallel pipeline on the Codex side
