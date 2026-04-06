# Proposal: Using codingagents to develop codingagents

**Status:** Revised draft — updated after Codex review
**Date:** 2026-04-06
**Branch:** `dogfood/using-codingagents-to-develop-codingagents`

---

## Goal

Use the codingagents pipeline to develop ISS-001 (invariants-audit skill), exercising the framework's own process to increase quality, catch real-world bugs, and validate usability.

## Codex review recommendation

Proceed with the dogfood plan, but execute it against the pipeline as it exists today rather than a future simplified install shape.

- Keep the process-vs-deployment split. Running the feature through the real pipeline in this repo is still the right way to validate phase flow, handoffs, hooks, and usability.
- Use the **current required installed shape** for the dogfood run: `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/helpers/`, `.claude/schemas/`, and `.claude/settings.json`.
- Do **not** turn ISS-005 into a deployment-model redesign. If we want to prove that roles/skills no longer need to be installed, that should be a separate framework change first.
- Treat incorrect `CLAUDE.md` targeting as a framework bug to fix as part of this work. Today, Phase 2 and Phase 7 still point at root `CLAUDE.md`, which is the consumer template in this repo.
- Keep `.gitignore` behavior aligned with the current framework model: ignore runtime artifacts only. Do not add blanket ignore rules for installed framework files just for dogfooding.

## Principles

1. **Development rigor** — use the same phase-gated process being developed for consumers
2. **Real-world testing** — exercise the pipeline against real development to find bugs and edge cases
3. **Simplicity** — keep the dogfood setup maintainable; no special modes for 80-90% of use cases

## Key insight: separate process from deployment

The pipeline has two distinct concerns:

| Concern | What it is | How to test |
|---------|-----------|-------------|
| **Process** | Phase gates, handoffs, hooks, verification, session discipline | Run the pipeline on a real feature (ISS-001) in this repo |
| **Deployment** | `init.sh`, `upgrade.sh`, file copying, version tracking | Automated tests on scratch directories (`test-install-scripts.sh`) |

Conflating them (running `init.sh` on the source repo) tests an edge case no consumer hits (source === target), introduces hacks (`.gitignore` duplicates, CLAUDE.md protection, scoped Phase 7), and makes both concerns harder to evaluate.

## What the process needs to run today

The current pipeline requires the same installed shape that `init.sh` and `upgrade.sh` produce for consumers:

1. **Agents** — `.claude/agents/ROLE_*.md`
2. **Slash commands** — `.claude/commands/*.md` for `/specify`, `/architect`, etc.
3. **Skills** — `.claude/skills/*` because commands currently load skills from installed `.claude/skills/...` paths
4. **Hooks** — `.claude/helpers/checkpoint.js`, `restore-context.js`, `archive-context.js` + `.claude/settings.json`
5. **Schema** — `.claude/schemas/handoff.schema.json`

Project context still matters, but in this repo it is split across the root template `CLAUDE.md` and the framework-specific `docs/CLAUDE.md`.

This is an important distinction:
- **For ISS-005**, we should dogfood the pipeline using the current required shape.
- **If we want a smaller install footprint later**, that should be proposed and implemented as a separate framework change, then dogfooded on its own merits.

## The CLAUDE.md design

Root `CLAUDE.md` is a template for target projects (placeholder comments, generic structure). It cannot simultaneously be project-specific instructions for this repo.

Claude Code already loads both `CLAUDE.md` and `docs/CLAUDE.md`. The root file provides pipeline routing, agent tables, and phase sequences — useful for any project including this one. `docs/CLAUDE.md` provides framework-development instructions.

No new file is needed. No "dogfood CLAUDE.md" wrapper. Just extend what's already there.

However, the current command contracts still need adjustment for this repo:
- Phase 2 currently tells the architect to read the Architecture Notes section of root `CLAUDE.md`
- Phase 7 currently tells the documentation phase to read and update root `CLAUDE.md`

That mismatch is a real framework bug, and ISS-005 should surface and fix it rather than work around it silently.

## Proposed setup

### 1. Install the current required pipeline shape

Copy the same categories the real installer currently copies, because that is the contract we are trying to validate:

```bash
# Agents
mkdir -p .claude/agents
cp ROLE_*.md .claude/agents/

# Commands (slash commands)
mkdir -p .claude/commands
cp commands/*.md .claude/commands/

# Skills
mkdir -p .claude/skills
cp -R skills/* .claude/skills/

# Hooks
mkdir -p .claude/helpers
cp hooks/checkpoint.js .claude/helpers/
cp hooks/archive-context.js .claude/helpers/
cp hooks/restore-context.js .claude/helpers/
cp hooks/settings.json .claude/settings.json

# Schema (for handoff validation)
mkdir -p .claude/schemas
cp schemas/handoff.schema.json .claude/schemas/
```

Keep `.gitignore` behavior aligned with the shipped framework model:

- Ignore **runtime artifacts** via the existing `.gitignore-template`
- Do **not** add broad ignore rules for installed agents / commands / skills / hooks / schemas just for this dogfood branch
- If the installed copies become noisy during the experiment, that is signal that the deployment model may need a follow-up redesign, not a reason to hide the current contract during validation

### 2. Extend `docs/CLAUDE.md` with project-specific sections

Add the sections pipeline agents expect, specific to the codingagents framework:

- **Code conventions** — shell scripts use `set -euo pipefail`, skills stay under 100 lines, commands include YAML frontmatter, etc.
- **Naming** — roles are `ROLE_UPPER_SNAKE.md`, skills are `skills/kebab-case/SKILL.md`, commands are `commands/kebab-case.md`
- **Architecture notes** — separation of WHO (roles), WHAT (commands), HOW (skills); handoff.json as the phase contract
- **Known gotchas** — checkpoint.js detects phases from file existence; commands currently reference installed skill paths; `docs/CLAUDE.md` is auto-loaded alongside root; root `CLAUDE.md` remains the consumer template

### 3. Fix `CLAUDE.md` targeting for framework development

`docs/CLAUDE.md` should become the repo-specific source of truth for framework-development conventions, architecture notes, and gotchas.

At minimum:
- Phase 2 should read the framework-specific architecture guidance from `docs/CLAUDE.md`, not from the root template
- Phase 7 should update `docs/CLAUDE.md` for framework-specific conventions and gotchas, not the root template
- Root `CLAUDE.md` should remain a target-project template unless the feature truly changes the consumer-facing template itself

If the current command instructions are wrong or ambiguous, that is exactly the kind of framework bug this dogfood should surface and fix.

### 4. Deployment testing stays separate

`init.sh` and `upgrade.sh` are tested mechanically:

- `test-install-scripts.sh` already exists — expand coverage for edge cases:
  - Source === target directory
  - Pre-existing `docs/` directory with non-pipeline content
  - `.claude/settings.json` merge with pre-existing `settings.local.json`
  - Re-running init.sh on an already-initialized project
- Tests run on temp directories, not on this repo
- These are deterministic tests — no LLM, no pipeline session

## What this exercises

Running the pipeline on ISS-001 in this repo will test:

| Component | What gets exercised |
|-----------|-------------------|
| Slash commands | All 7 phase commands invoked end-to-end |
| Installed pipeline contract | Whether the current `agents + commands + skills + hooks + schemas` install shape is sufficient and ergonomic in real use |
| Handoff contract | Each phase writes handoff.json; next phase reads it |
| Hooks | checkpoint.js validates handoffs, restore-context.js loads them, archive-context.js preserves context |
| Phase detection | checkpoint.js must correctly identify phases from `docs/features/invariants-audit/` artifacts |
| Verification gates | Each phase's verification commands must pass before handoff |
| Token tracking | `.claude/token-usage.jsonl` accumulates real per-phase costs |
| Session discipline | Fresh sessions per phase, `/status` at start, `/compact` at 60% |
| CLAUDE.md targeting | Tests whether phases that depend on project context read/update the correct file in the framework repo |

## What this does NOT test

| Not tested here | Tested by |
|----------------|-----------|
| `init.sh` on a fresh project | `test-install-scripts.sh` |
| `upgrade.sh` from v4.1 | `test-install-scripts.sh` |
| CLAUDE.md template quality for new projects | Manual review or consumer feedback |
| Codex review layer integration | Separate Codex sessions (non-blocking) |

## Risks

- **Hooks may be noisy** — checkpoint.js fires on every session stop, including non-pipeline work. Mitigation: accept during dogfood period, remove `.claude/settings.json` after.
- **Installed copies may feel heavyweight in the source repo** — we are intentionally validating the current shipped contract, not a hypothetical slimmer one. Mitigation: keep any install-footprint simplification as a separate follow-up issue rather than mutating ISS-005 midstream.
- **CLAUDE.md targeting may be inconsistent across phases** — Phase 2 and Phase 7 are the most obvious cases, but other prompts may also assume root `CLAUDE.md` is the only project context. Mitigation: audit and fix command wording before or during the dogfood run; log every mismatch as framework feedback.
- **docs/features/ mixes with framework docs** — pipeline artifacts land in `docs/features/invariants-audit/` alongside framework docs in `docs/design/`, `docs/memory/`, `docs/issues/`. Mitigation: this is the intended structure — `docs/features/` is already in the consumer layout.

## Success criteria

1. ISS-001 (invariants-audit skill) is developed through all 7 phases
2. Each phase produces a valid handoff.json that the next phase consumes
3. Real bugs or usability issues found during the run are logged to `docs/issues/backlog.md`
4. Token usage is tracked and compared against budget targets
5. The experience informs improvements to commands, hooks, or docs — committed as framework improvements
