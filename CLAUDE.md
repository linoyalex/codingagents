# CLAUDE.md — Project Instructions & Agent Router

> This file is loaded automatically by Claude Code at the start of every session.
> It is the single source of truth for project conventions and agent routing.
> Keep it current. It is more valuable than any other file in this repo.
>
> For framework-specific development instructions, see `docs/CLAUDE.md`.

---

## Project Overview

The **codingagents** framework — a token-efficient, phase-gated multi-agent development pipeline for Claude Code. Eight role definitions, reusable skills, slash commands, lifecycle hooks, structured handoffs, and deployment tooling. This repo is the source; `init.sh` and `upgrade.sh` install it into target projects.

---

## Tech Stack

```
Runtime:      Node 22
Testing:      node --test (built-in test runner)
Shell:        bash (set -euo pipefail)
Package mgr:  npm
```

---

## Commands

```bash
node --test tests/                    # Run all tests
node --test tests/contracts/          # Contract tests only
node --test tests/integration/        # Integration tests only
node --test tests/e2e/                # E2E tests only
bash tests/test-install-scripts.sh    # Installer tests
bash tests/test-command-contracts.sh  # Command contract checks
```

---

## Agent Router

**This project uses a phase-gated pipeline. Invoke agents in order, not ad-hoc.**
Each phase reads only the output of the previous phase — never the full codebase.

### Pipeline Sequence

```
Feature request
    │
    ▼ Phase 1 — SPECIFY         [product-owner + ux-designer]   model: haiku   (authoring)
    │  Reads: feature request only
    │  Writes: docs/features/<feature>/prd.md
    │
    ▼ Phase 2 — ARCHITECT       [architect]                      model: opus    (authoring)
    │  Reads: docs/features/<feature>/prd.md + CLAUDE.md (arch section only)
    │  Writes: docs/features/<feature>/architecture.md
    │
    ▼ Phase 3 — TEST DESIGN     [qa]                             model: sonnet  (authoring)
    │  Reads: docs/features/<feature>/prd.md + architecture.md only (NOT src/)
    │  Writes: tests/contracts/ + tests/e2e/ (failing shells)
    │
    ▼ Phase 4 — SECURITY GATE   [security-reviewer]              model: opus    (gate/review)
    │  Reads: docs/features/<feature>/prd.md + architecture.md only (NOT src/)
    │  Writes: docs/features/<feature>/security-audit.md
    │
    ▼ Phase 5 — IMPLEMENT       [developer]                      model: sonnet  (authoring)
    │  Reads: docs/features/<feature>/architecture.md + failing test files only
    │  Writes: src/ (TDD: RED commit → GREEN commit → REFACTOR commit)
    │
    ▼ Phase 6 — REVIEW          [code-reviewer] FRESH SESSION    model: sonnet  (gate/review)
    │  Reads: git diff only
    │  Writes: docs/features/<feature>/review.md
    │
    ▼ Phase 7 — DOCUMENT        [documentation-specialist]       model: haiku
       Reads: docs/features/<feature>/prd.md + CHANGELOG.md + CLAUDE.md + latest release-notes/
       Writes: CHANGELOG.md update + release-notes/ entry + CLAUDE.md conventions update
```

### Ad-hoc routing (outside the pipeline)

| Task | Agent | Model |
|------|-------|-------|
| Bug fix (no spec needed) | `developer` | sonnet |
| Security incident / auth change | `security-reviewer` | opus |
| New dependency approval | `architect` | opus |
| CLAUDE.md update | `documentation-specialist` | haiku |
| PR review (always fresh context) | `code-reviewer` | sonnet |

---

## Code Conventions

### Must Follow
- **Artifact timestamps** — every pipeline-generated feature artifact must include a `**Generated:** <ISO 8601>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time.
- **Review artifact freshness check** — when a phase consumes a review artifact, re-read the file from disk at phase start and echo the current `**Generated:**` line before acting on its findings.
- **Separate context for gate phases** — Phase 4 (security gate) and Phase 6 (code review) must run in separate agent sessions from authoring phases (1–3, 5). Enforced via `produced_by` check.
- **Handoff source_spec is required** — all handoffs must include a resolvable `source_spec` pointing to the originating PRD or ticket. Reviewers load source_spec before reading diff.
- **Commands that load skills must have a `## Skill References` table** — structural `| Skill | Source path |` table in the command file. Fail-closed: commands with skill-loading prose (`skills/` or `.claude/skills/`) but no table will fail the wiring contract test.
- **Skill size budget** — inline skills: ~150 lines instructional prose (templates/tables/examples excluded), 250 total lines triggers split. Progressive disclosure skills: SKILL.md ≤120 prose lines with sibling reference files at `skills/<name>/<reference>.md`. Link format: `[See reference: .claude/skills/<name>/<reference>.md]`. Worked example: `verification-gate` (per-phase reference files). Stop conditions footer rule: pipeline-gating skills (verification-gate, security-audit, tdd, code-review) must end with `**STOP CONDITIONS (end of file):**` — reviewer may skim; footer prevents missing hard constraints.
- **Sibling reference files must document their purpose boundary** — each sibling reference file must state what content belongs in the file and when it should be split into focused siblings (e.g., at ~80 lines or when off-purpose content is added). This prevents combined sibling files from becoming undifferentiated dumping grounds as the skill grows.
- **Skills that require named artifacts must have a `## Required Artifacts` table** — 4-column format: `| Artifact | Pattern | Path | Condition |`. The wiring contract test validates that the invoking command's Output section references both the Pattern and Path for each declared artifact.
- **Tests must use structural anchors** (heading names, template field labels), not phrase-binding.
- **Guidance must be stack-agnostic** — include "adapt to your stack" language with multiple toolchain examples.
- **Source and installed copies must be kept in sync** — byte-identical between `skills/`, `commands/`, `hooks/` and their `.claude/` counterparts.
- Shell scripts use `set -euo pipefail`
- All JSON schemas use draft-07 with `additionalProperties: false`
- No hardcoded absolute paths — use relative paths from project root

---

## Absolute Constraints (Agents Must Never Violate)

- ❌ Never commit secrets, API keys, or credentials to source code
- ❌ Never add a new dependency without checking if an existing one covers the need
- ❌ Never use `any` in TypeScript without an explicit `// TODO: type this` comment
- ❌ Never remove or skip an existing test to make the suite pass
- ❌ Gate reviewers must never write to src/ — read-only on implementation files

---

## Known Gotchas

- **Handoff source_spec must be resolvable** — if a PRD or ticket file is moved after handoff, the review phase will halt. Keep file paths canonical.
- **Separate-context enforcement depends on produced_by** — gate reviewers must be launched in a different agent session. If an agent omits `produced_by`, the check silently passes.
- **Reviewer Independence is a methodology, not automatic** — enforcement depends on reviewer discipline. Contract tests verify the methodology is present.
- **Review artifacts can go stale in chat context** — treat the on-disk file and its `**Generated:**` line as the source of truth; re-open before resolving feedback.

---

## Architecture Notes

See `docs/CLAUDE.md` for full architecture notes including:
- Core abstraction (WHO/WHAT/HOW), phase contract, hooks lifecycle
- File ownership boundaries (Claude vs Codex vs Shared)
- Naming conventions, folder structure
- Known gotchas specific to framework development

### ADR Index
- [Dogfood proposal](docs/design/dogfood-proposal.md) — using codingagents to develop codingagents

---

*Last updated: 2026-04-16*
*Updated by: documentation-specialist (phase 7 — invariants-audit)*
