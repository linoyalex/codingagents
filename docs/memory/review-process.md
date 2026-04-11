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

## When splitting work

- Define file ownership boundaries clearly so Claude and Codex can work in parallel.
- Claude owns: hooks, schemas, roles, skills, deployment scripts, CLAUDE.md, PIPELINE.md.
- Codex owns: codex/reviewers/, codex/templates/, codex/log-usage.sh, codex/report-usage.sh, codex/README.md.
- Shared contracts (JSONL schema, handoff schema, budget targets) must be locked before parallel work begins.
