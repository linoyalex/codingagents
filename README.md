# codingagents

A token-efficient, phase-gated multi-agent development pipeline for Claude Code, with optional Codex review integration. Eight specialised role definitions, eight reusable skills, nine slash commands, lifecycle hooks with token tracking, structured handoffs, and deployment tooling that reduce token usage by ~3-4x compared to unstructured single-session coding.

---

## What this is

A complete system for structuring AI-assisted software development around a seven-phase pipeline. Each phase runs in its own isolated context, reads only the output of the previous phase, and uses the cheapest model capable of the task. The result: roughly **63K tokens per feature cycle** instead of the typical 200K-400K from ad-hoc sessions.

```
Phase 1  SPECIFY        product-owner + ux-designer   → docs/features/<feature>/prd.md           (Haiku)
Phase 2  ARCHITECT      architect                      → docs/features/<feature>/architecture.md  (Opus)
Phase 3  TEST DESIGN    qa                             → tests/ failing shells                    (Sonnet)
Phase 4  SECURITY GATE  security-reviewer              → docs/features/<feature>/security-audit.md (Opus)
Phase 5  IMPLEMENT      developer                      → src/ via TDD                             (Sonnet)
Phase 6  REVIEW         code-reviewer (fresh context)  → docs/features/<feature>/review.md         (Sonnet)
Phase 7  DOCUMENT       documentation-specialist       → CHANGELOG + release-notes                 (Haiku)
```

**Core principle:** Agents pass files, not conversation history. Each phase produces one compact artifact and writes a structured `.claude/handoff.json` — a machine-readable contract that the next phase reads at session start.

---

## What's new in v5

- **Structured handoffs** — `.claude/handoff.json` replaces free-form markdown handoffs. Schema-validated by the Stop hook as a blocking gate.
- **Token usage tracking** — all sessions log to `.claude/token-usage.jsonl` with per-phase, per-iteration, per-agent attribution. Retry cycles are tracked separately from first-pass costs.
- **Memory governance** — explicit rules for what belongs in CLAUDE.md vs skills vs handoff packets, with line limits to prevent context bloat.
- **Deployment tooling** — `init.sh` and `upgrade.sh` replace the manual 6-step copy process. Version tracking via `.claude/.codingagents-version`.
- **Codex review layer** (optional) — independent cross-model review at four pipeline checkpoints, with shared token tracking.
- **Baseline metrics** — budget targets per phase with a reporting script to compare actuals against targets.

---

## Repo structure

```
├── CLAUDE.md                        ← Root router; auto-loaded by every Claude Code session
├── PIPELINE.md                      ← Full pipeline reference with token budgets and baseline metrics
├── HOW_TO_USE.md                    ← Setup guide and session discipline rules
│
├── ROLE_ARCHITECT.md                ← Phase 2 — Opus, irreversible decisions
├── ROLE_CODE_REVIEWER.md            ← Phase 6 — Sonnet, fresh context only, read-only
├── ROLE_DEVELOPER.md                ← Phase 5 — Sonnet, TDD: red/green/refactor
├── ROLE_DOCUMENTATION_SPECIALIST.md ← Phase 7 — Haiku, changelog + CLAUDE.md
├── ROLE_PRODUCT_OWNER.md            ← Phase 1 — Haiku, spec and acceptance criteria
├── ROLE_QA.md                       ← Phase 3 — Sonnet, write failing tests first
├── ROLE_SECURITY.md                 ← Phase 4 — Opus, design-time audit, read-only
├── ROLE_UX_DESIGNER.md              ← Phase 1 — Haiku, screen states + flows
│
├── skills/                          ← Reusable execution procedures (HOW)
│   ├── prd-writing/SKILL.md         ← Story format, AC template, RICE framework
│   ├── architecture-decision/SKILL.md ← ADR template, fitness functions, tech radar
│   ├── tdd/SKILL.md                 ← RED/GREEN/REFACTOR, property-based testing
│   ├── security-audit/SKILL.md      ← OWASP Top 10, serverless threats, audit template
│   ├── structured-logging/SKILL.md  ← Log format, levels, PII rules, security events
│   ├── code-review/SKILL.md         ← Conventional comments, finding cap, taxonomy
│   ├── release-docs/SKILL.md        ← Changelog, release notes, process learnings
│   └── verification-gate/SKILL.md   ← Phase verification, handoff validation, retrospectives
│
├── commands/                        ← Slash commands — one per pipeline phase
│   ├── specify.md                   → /specify [feature description]
│   ├── architect.md                 → /architect [feature-name]
│   ├── test-design.md               → /test-design [feature-name]
│   ├── security-gate.md             → /security-gate [feature-name]
│   ├── implement.md                 → /implement [feature-name]
│   ├── review.md                    → /review [feature-name]
│   ├── document.md                  → /document [feature-name]
│   ├── status.md                    → /status
│   └── handoff.md                   → /handoff
│
├── schemas/                         ← Schema definitions
│   └── handoff.schema.json          ← Handoff artifact schema (copied to target projects)
│
├── hooks/                           ← Lifecycle hooks
│   ├── settings.json                ← Claude Code hook config (copy to .claude/)
│   ├── archive-context.js           ← PreCompact: archives turns + logs token snapshot
│   ├── restore-context.js           ← SessionStart: loads handoff.json or archived turns
│   └── checkpoint.js                ← Stop: validates handoff (blocking), logs tokens, detects phase
│
├── init.sh                          ← New project setup script
├── upgrade.sh                       ← Existing project migration script
├── migrations/                      ← Version-specific migration logic
│   └── v4.1-to-v5.sh
├── .gitignore-template              ← Runtime artifact patterns for target projects
│
├── docs/                            ← Shared design docs, cross-agent memory, and repo-specific instructions
│   ├── CLAUDE.md                        ← Framework development instructions (repo-local only)
│   ├── design/
│   │   ├── v5-implementation-record.md  ← What shipped in v5 (implementation reference)
│   │   └── vnext-recommendations.md     ← What's left for vNext (Tier 2/3 + stretch goals)
│   └── memory/                          ← Shared cross-agent memory (Claude + Codex)
│       ├── session-bootstrap.md         ← Read-order guide for fresh sessions
│       ├── v5-decisions.md              ← Settled design decisions — do not re-debate
│       ├── codebase-map.md              ← Key files and where things live
│       ├── codex-rules.md               ← Non-negotiable rules for Codex sessions
│       ├── user-profile.md              ← User preferences and collaboration style
│       └── review-process.md            ← How iterative Claude + Codex review works
│
└── codex/                           ← Codex review layer (optional, operational files only)
    ├── fresh-context-playbook.md    ← Low-token patterns for Codex agents
    ├── reviewers/                   ← Review instruction files
    ├── templates/                   ← Input packet schemas and output formats
    ├── reviews/                     ← Generated review artifacts (gitignored)
    ├── log-usage.sh                 ← Manual token logging for Codex runs
    ├── report-usage.sh              ← Token usage reporting (reads .claude/token-usage.jsonl)
    └── README.md
```

---

## Quick setup

### Automated (recommended)

```bash
# From your target project root:
bash /path/to/codingagents/init.sh

# With Codex review layer:
bash /path/to/codingagents/init.sh --codex
```

This copies all roles, commands, skills, hooks, schemas, shared `docs/design` and `docs/memory` context, and configuration in one step. It creates the directory structure, updates `.gitignore` with runtime artifact patterns, and writes a version file.

After running, edit `CLAUDE.md` to fill in your project-specific sections.

### Upgrading from v4.1

```bash
bash /path/to/codingagents/upgrade.sh          # pipeline only
bash /path/to/codingagents/upgrade.sh --codex   # pipeline + Codex review layer
```

This backs up `.claude/` before replacing framework files. It also refreshes the shared `docs/design/` and `docs/memory/` files used by fresh sessions. `CLAUDE.md` is not touched — review it manually for new sections (Phase Handoff Protocol, Memory & Instruction Governance).

### Manual setup

See [HOW_TO_USE.md](HOW_TO_USE.md) for step-by-step instructions.

---

## Running a feature cycle

```bash
claude                          # start Claude Code

/status                         # always run first — shows where you are

/specify Add user auth flow     # Phase 1 — writes docs/features/user-auth/prd.md (~3K tokens, Haiku)
/architect user-auth            # Phase 2 — writes architecture doc (~8K tokens, Opus)
/test-design user-auth          # Phase 3 — writes failing tests (~10K tokens, Sonnet)
/security-gate user-auth        # Phase 4 — writes security audit (~6K tokens, Opus)
/implement user-auth            # Phase 5 — TDD red/green/refactor (~25K tokens, Sonnet)
# ↑ quit and start a fresh session before review ↑
/review user-auth               # Phase 6 — diff-only review (~8K tokens, Sonnet)
# ↑ after PR merged ↑
/document user-auth             # Phase 7 — changelog + CLAUDE.md update (~3K tokens, Haiku)
```

**Total: ~63K tokens first pass.** Budget allows ~20K for retry overhead (~83K combined target).

Each phase writes `.claude/handoff.json` at completion. The Stop hook validates it as a blocking gate — the pipeline cannot proceed without a valid handoff.

---

## Structured handoffs

Every agent writes `.claude/handoff.json` at the end of its phase with:

| Field | Required | Description |
|---|---|---|
| `feature` | Yes | Feature name or ID |
| `phase` | Yes | Pipeline phase number (1-7) |
| `goal` | Yes | What the next agent should accomplish |
| `scope` | Yes | What is in scope for the next phase |
| `relevant_files` | Yes | Files the next agent should read first |
| `acceptance_criteria` | Yes | ACs that carry forward |
| `verification_commands` | Yes | Commands to verify the next phase's output |
| `constraints` | No | Hard constraints for the next phase |
| `known_risks` | No | Open questions or risks |
| `produced_by` | No | Agent role that produced this handoff |
| `timestamp` | No | ISO 8601 timestamp |

The schema is defined in `schemas/handoff.schema.json`. The `checkpoint.js` Stop hook performs full schema validation (type checks, range constraints, unexpected property rejection) and exits with a non-zero code if validation fails.

---

## Token tracking

All sessions log to `.claude/token-usage.jsonl` automatically via hooks:

- **SessionStart** — records start time and feature context for the current session
- **PreCompact** — logs a mid-session snapshot before compaction
- **Stop** — logs the final entry with duration, token counts (from API metadata where available), iteration number, and agent/model attribution

Each entry includes `iteration` and `cycle` fields to distinguish first-pass costs from retry overhead:

```
Feature: user-profile-redesign
Phase        Agent              Iter  Tokens    Budget   Status
specify      product-owner         1    2,100     3,000   ✓
architect    architect             1    9,800     8,000   ⚠ +22%
implement    developer             1   22,000    25,000   ✓
review       code-reviewer         1    6,800     8,000   ✓  → REQUEST CHANGES
implement    developer             2    8,400       —     (retry)
review       code-reviewer         2    3,500       —     (retry) → APPROVE
```

Use `codex/report-usage.sh` to generate reports from the JSONL log.

---

## Session discipline

| Rule | Why |
|------|-----|
| Fresh session per pipeline phase | Prevents prior context from polluting the current task |
| `/compact` at 60% context | Auto-compaction loses context silently — manual is safer |
| `/handoff` before ending a long session | Writes a note the next session can read to resume |
| `/status` at the start of each session | Detects pipeline phase from handoff or file existence, prints next action |
| Never load more than 10 files per session | More than 10 means you're doing too much at once — split the task |
| Write `.claude/handoff.json` at end of phase | Blocking gate — Stop hook validates and rejects if missing |

---

## Model assignments

| Role | Model | Rationale |
|------|-------|-----------|
| product-owner | Haiku | Structured template filling |
| ux-designer | Haiku | Screen state tables, structured output |
| architect | **Opus** | Irreversible structural decisions |
| qa | Sonnet | Complex but correctable |
| security-reviewer | **Opus** | Asymmetric cost of a missed vulnerability |
| developer | Sonnet | Iterative, correctable via tests |
| code-reviewer | Sonnet | Pattern matching against known rules |
| documentation-specialist | Haiku | Mechanical template updates |

---

## Skills: separation of concerns

Skills are a key architectural concept (introduced in v4, extended in v5). Each skill is a standalone `SKILL.md` file containing reusable execution procedures — the **HOW** of a task. Roles define the **WHO** (identity, constraints, model tier), and commands define the **WHEN** (which phase to trigger). This separation gives you three benefits:

1. **Token efficiency** — roles are slim (~100 lines). Skills are loaded on demand only when a command invokes them, so a Phase 1 session never pays for Phase 5 procedures.
2. **Independent improvement** — you can refine a skill's templates or checklists without touching any role definition. Skills evolve at their own pace.
3. **Reusability** — the same `tdd` skill works whether invoked by the developer role, a CI script, or a different project entirely.

| Skill | Loaded by | What it contains |
|-------|-----------|-----------------|
| `prd-writing` | specify | Story format, acceptance criteria template, RICE prioritisation, screen states |
| `architecture-decision` | architect | ADR template, ARCH template, fitness functions, decision framework, tech radar |
| `tdd` | implement | RED/GREEN/REFACTOR cycle, Arrange/Act/Assert, property-based testing, coverage thresholds |
| `security-audit` | security-gate | OWASP Top 10 checklist, serverless threat vectors, auth verification, severity levels |
| `structured-logging` | implement, security-gate | Structured log format, log levels, PII scrubbing, security event requirements |
| `code-review` | review | Conventional comments format, finding cap, diff reading, feedback taxonomy |
| `release-docs` | document | Changelog format, release notes template, process learnings, CLAUDE.md updates |
| `verification-gate` | all phases | Phase-specific verification, handoff validation, universal checklist, no-go criteria, retrospective protocol |

---

## Slash command frontmatter

All command files include YAML frontmatter for VS Code Claude extension compatibility:

```yaml
---
description: Write a PRD from a feature request (Phase 1)
user-invocable: true
---
```

The `description` field appears in VS Code's command palette, and `user-invocable: true` registers the command as a slash command accessible from the editor.

---

## Codex review layer (optional)

Codex acts as an independent verification layer — a second model's perspective that challenges Claude's outputs at key checkpoints. It does not duplicate the pipeline; it only reviews.

```
Claude Pipeline (builds)            Codex Review Layer (challenges)
────────────────────────            ────────────────────────────────
Phase 1 → docs/prd.md         ───→  Codex: review-prd
Phase 2 → ARCH doc             ───→  Codex: review-architecture
Phase 3 → failing tests        ───→  Codex: review-test-design
Phase 5 → src/ changes         ───→  Codex: review-code
```

Key properties:
- **Non-blocking.** The Claude pipeline never waits on Codex.
- **Shared metrics.** Codex logs to the same `.claude/token-usage.jsonl` via `codex/log-usage.sh`.
- **Incremental rollout.** Start with code review only (~4-6K tokens). Add other checkpoints after validation.

Install with `init.sh --codex` or `upgrade.sh --codex`. See `codex/README.md` for workflow details.

### Invoking Codex reviews

Start with `review-code` only.

Recommended invocation:

```text
Use codex/reviewers/review-code.md.
Review git diff main...HEAD with findings-first output.
Prioritize correctness, security, and missing tests.
Use file:line evidence and give a merge recommendation.
If .claude/handoff.json exists, use it only for AC and risk context.
Write the result to codex/reviews/review-code-[feature].md.
```

After the run, log token usage:

```bash
# Args: <feature> <phase> <agent> <model> <input_tokens> <output_tokens> <duration_seconds> <verification_passed>
./codex/log-usage.sh user-auth review-code codex-review-code o3 4200 900 145 true
```

Then inspect totals:

```bash
./codex/report-usage.sh user-auth
```

**Other reviewers** follow the same pattern (add after code review is validated):

| Reviewer | Reads | Add after |
|---|---|---|
| `codex/reviewers/review-test-design.md` | `tests/contracts/`, `tests/e2e/`, `docs/prd.md` | Code review validated |
| `codex/reviewers/review-architecture.md` | `docs/architecture/ARCH-[feature].md`, `docs/prd.md` | Test design review validated |
| `codex/reviewers/review-prd.md` | `docs/prd.md` | Architecture review validated |

Keep each Codex run scoped to one artifact and one review file. If findings flow back into the Claude pipeline, cap the injected summary at 500 tokens.

---

## Context management hooks

The three hook scripts in `hooks/` handle context preservation, structured handoffs, and token tracking.

**`restore-context.js`** (SessionStart hook) — loads `.claude/handoff.json` as primary context if available (feature, goal, scope, files to read, acceptance criteria). Falls back to archived turns when no handoff exists. Records session start time and feature for token tracking.

**`archive-context.js`** (PreCompact hook) — fires before Claude auto-compacts the context. Scores each conversation turn for importance (architecture decisions, errors, constraints score higher), saves the top 50 turns to `.claude/context-archive/turns.json`. Logs a token usage snapshot before compaction.

**`checkpoint.js`** (Stop hook) — fires when a session ends. Validates `.claude/handoff.json` as a **blocking gate** (exits with error if missing or invalid). It detects the completed phase from pipeline artifacts, uses handoff metadata for feature and agent attribution, logs token usage with iteration counting, and writes `.claude/pipeline-checkpoint.json` with the next recommended action.

---

## Token budget targets

| Phase | Model | First-pass budget |
|---|---|---|
| 1 - Specify | Haiku | ~3K |
| 2 - Architect | Opus | ~8K |
| 3 - Test Design | Sonnet | ~10K |
| 4 - Security Gate | Opus | ~6K |
| 5 - Implement | Sonnet | ~25K |
| 6 - Review | Sonnet | ~8K |
| 7 - Document | Haiku | ~3K |
| **First-pass total** | | **~63K** |
| **Retry allowance** | | **~20K** |
| **Combined target** | | **~83K** |
| Codex review (initial, code only) | | ~4-6K |
| Codex review (full ceiling, all 4 checkpoints) | | ~12-17K |

---

## Memory and instruction governance

| Content type | Location | Loaded | Max size |
|---|---|---|---|
| Project conventions, agent routing | `CLAUDE.md` | Always | ~250 lines |
| Reusable procedures | `skills/*.md` | On demand | ~100 lines each |
| Phase-specific context | `.claude/handoff.json` | At session start | ~50 lines |
| Per-feature specs | `docs/` | By phase spec | No hard limit |
| Agent memory | `.claude/agent-memory/` | On demand | ~100 lines each |

Rules:
- Do not duplicate information across locations.
- CLAUDE.md must stay under ~250 lines. Extract to skills or handoff packets if it grows.
- Skills are loaded on demand, not pasted into CLAUDE.md.
- Handoff packets are ephemeral — overwritten each phase.

---

## Token antipatterns this system prevents

| Antipattern | Typical cost | This system's fix |
|-------------|-------------|-------------------|
| One session for the whole feature | 200K-400K tokens | 7 isolated phase sessions |
| Architect reads all of `src/` | +50K tokens | Architect reads prd.md + CLAUDE.md only |
| Developer reads entire codebase before coding | +30K tokens | Developer reads ARCH doc + test files only |
| Code reviewer opens every file in changed modules | +40K tokens | Reviewer reads `git diff` only |
| Opus for changelogs and template fills | 15x markup | Haiku for all mechanical/structured tasks |
| Every role carries full procedure docs | +20K tokens/session | Skills loaded on demand; roles are ~100 lines |
| Silent context loss on auto-compaction | Loses history | PreCompact hook archives before compaction |
| Free-form handoffs replayed as conversation | +10K tokens | Structured handoff.json with schema validation |
| No visibility into token spend | Budget drift | JSONL tracking with per-phase, per-iteration reporting |

---

## Recommended external resources

| Resource | What to use it for |
|----------|-------------------|
| [Ruflo](https://github.com/ruvnet/ruflo) | More sophisticated context archiving; run `npx ruflo@latest init` and keep only the hooks config |
| [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | `context: fork` pattern for parallel subagents, advanced slash command patterns |
| [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) | First-principles explanation for why the handoff pattern works |

---

## Versioning

- **v1** — initial Gemini-drafted role definitions
- **v2** — added `disallowedTools`, verifiable DoD with shell commands, `## Constraints` tables, CLAUDE.md router, `memory: project` on Architect and Docs Specialist
- **v3** — phase-gated pipeline, model tier assignments, slash commands, lifecycle hooks, token budget documentation
- **v4** — extracted skills from roles (separation of concerns), YAML frontmatter on all commands for VS Code, standardised output paths (`docs/reviews/`, `docs/security/`), release notes generation in documentation phase, verification-gate skill for all phases
- **v4.1** — new structured-logging skill (cross-cutting: architect, security, developer, reviewer), retrospective protocol for self-improving feedback loops, conventional comments format in code-review, property-based testing in TDD, architectural fitness functions, serverless/edge threat vectors in security-audit, process learnings in release-docs
- **v5 (current)** — structured handoff.json with schema validation (blocking gate), token usage tracking with JSONL logging and iteration awareness, memory governance rules, deployment tooling (`init.sh`/`upgrade.sh` with v4.1 migration), optional Codex review layer with shared metrics, baseline metrics and budget targets in `PIPELINE.md`, artifact-based phase detection, and improved agent/model attribution in token logs

---

## Contributing

There are three levels of customisation, from lowest effort to most impactful:

**1. Extension Points in roles** — fill in the `## Extension Points` section at the bottom of each role file with your project's specific stack, conventions, and forbidden patterns. The more specific those sections, the less correction you'll need on agent outputs.

**2. Skill refinement** — each `SKILL.md` contains templates, checklists, and procedures. Editing a skill immediately improves every agent that references it. For example, adding your project's lint rules to `skills/tdd/SKILL.md` means every `/implement` session automatically follows them.

**3. CLAUDE.md** — the highest-leverage file in the system. Every agent session starts by reading it. Keep it current using the `/document` command after each feature merge.
