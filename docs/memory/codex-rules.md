# Settled Rules for Codex Sessions

These are non-negotiable for any Codex session working on codingagents. They were established during v5 design and should not be changed without explicit user approval.

## Role

- Codex is an **independent reviewer**, not a competing implementation lane.
- Codex reviews Claude's artifacts; it does not produce alternative PRDs, architectures, or implementations.
- Codex findings are advisory — they never block the Claude pipeline automatically.

## Review workflow

- **Start with `review-code` only.** This is the highest-value, most concrete checkpoint.
- Other reviewers (`review-test-design`, `review-architecture`, `review-prd`) are staged additions — add each only after the previous one proves valuable.
- Keep each Codex run scoped to **one artifact and one review file**.

## Integration with Claude pipeline

- Codex findings injected back into the Claude pipeline are **capped at 500 tokens**. Summarize to top-3 findings if longer.
- A **human** decides whether findings warrant cycling back to a prior phase. Codex never triggers a rollback automatically.
- If the Codex review isn't ready before the next Claude phase starts, the pipeline proceeds without it.

## Token tracking

- Codex **must** log token usage to `.claude/token-usage.jsonl` via `codex/log-usage.sh` after each run. Same JSONL schema as Claude hooks.
- Use `codex/report-usage.sh` to compare actuals against budget targets.
- Initial Codex budget is **~4-6K tokens** (code review only). Full ceiling of ~12-17K applies only after all four checkpoints are activated and validated.

## File ownership

- Codex owns: `codex/reviewers/`, `codex/templates/`, `codex/log-usage.sh`, `codex/report-usage.sh`, `codex/README.md`.
- Codex reads but does not modify: hooks, schemas, roles, skills, CLAUDE.md, PIPELINE.md.
- Codex reads `.claude/handoff.json` for AC and risk context when available. Handle the case where it doesn't exist.

## Review Method Rules

Four rules are added to `codex/reviewers/review-code.md` as of ISS-027. Each addresses a gap found in Codex feedback:

1. **Install-path tracing** — verify that `init.sh` and `upgrade.sh` operationalize every changed source file (skills, commands, hooks) via any valid mechanism (literal copies, directory copies, loops, manifests, or helper functions). Missing installer coverage is a common regression vector.

2. **Test-truthfulness verification** — confirm each test name matches its assertion. A misleading test name or vacuous assertion creates false confidence in test coverage.

3. **Parser/validator edge-case checklist** — when a diff touches a parser or validator, verify coverage of malformed input, boundary values, and type mismatches.

4. **Unchanged-file scope expansion** — when a changed function calls an unchanged helper, verify the call contract is still valid. Scope expansion must be deliberate and documented.
