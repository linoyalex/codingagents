# Review Process

All significant proposals and implementation changes go through iterative Claude + Codex review.

## Why

Codex catches inconsistencies, stale references, and spec-implementation mismatches that Claude misses because Claude wrote the original. The v5 design went through 8+ rounds of Codex review, catching issues including:
- Blocking gate not actually blocking (advisory only)
- Phase detection missing 3 of 7 phases
- Version string inconsistencies across files
- Documentation contradictions between sections
- Manual validation commands weaker than enforced hook validation
- Memory files described but not actually present in the repo

## How it works

1. Claude proposes or implements.
2. User hands the output to Codex for independent review.
3. Codex produces findings (High / Medium / Low severity).
4. User relays findings to Claude.
5. Claude addresses all findings — Low items are not automatically dismissed.
6. Repeat until Codex reports no remaining issues.

## Codex-specific guidance

For Codex review rules, file ownership, token budgets, and review method expectations,
see [docs/memory/codex-rules.md](codex-rules.md) — that file is the canonical source of
truth for all Codex session conventions.

## When splitting work

- Define file ownership boundaries clearly so Claude and Codex can work in parallel.
- See `docs/memory/codex-rules.md` for the authoritative file ownership table.
- Shared contracts (JSONL schema, handoff schema, budget targets) must be locked before parallel work begins.
