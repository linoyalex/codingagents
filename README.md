# codingagents

A token-efficient, phase-gated multi-agent development pipeline for Claude Code, with optional Codex review integration. Eight specialised role definitions, ten reusable skills, nine slash commands, lifecycle hooks with token tracking, structured handoffs, and deployment tooling that reduce token usage by ~3-4x compared to unstructured single-session coding.

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

**Core principle:** Agents pass files, not conversation history. Each phase produces one compact artifact, and each advancing phase writes a structured `.claude/handoff.json` — a machine-readable contract that the next phase reads at session start.

---

## What's new in v5.11

- **Invariants-audit skill** — new reusable skill for cross-layer semantic review. Teaches reviewers to detect contradictions between spec, implementation, hooks, and tests that survive passing test suites. Five-step invariant analysis method covering state-machine bugs, blocked/rejected/retry paths, fixture-template-validator mismatches, and tests that prove syntax but not behavior. Wired into 4 Claude commands (`/review`, `/architect`, `/security-gate`, `/test-design`) and 4 Codex reviewer prompts.
- **Hook scripts renamed `.js` → `.cjs`** — `checkpoint`, `resolve-feature`, `archive-context`, and `restore-context` now use the `.cjs` extension. Fixes a hard failure in consumer projects that have `"type": "module"` in `package.json` (Node treated `.js` as ESM and `require()` crashed). `upgrade.sh` cleans up legacy `.js` copies automatically.

### Earlier in v5

- **QA test quality hardening (v5.10)** — `commands/test-design.md` adds a `## Test Quality Rules` section with five subsections: Symmetric Testing, Behavioral Binding, Negative-Pattern Testing, Adversarial Contract Testing, and Artifact-Type Test Strategy. New `[symmetric-coverage]` and `[contract-robustness]` entries in the TDD skill. Sibling `skills/tdd/test-quality-rules.md` holds expanded guidance. Targets the ~50% rework cost from Phase 3 review feedback observed in earlier features.
- **CLAUDE.md section-level sync (v5.9)** — `--sync-claude-md` flag for `init.sh` and `upgrade.sh`. Syncs framework-owned sections from `docs/CLAUDE.md` into the consumer's root `CLAUDE.md` using managed HTML comment markers. Fail-closed allowlist limits which sections sync downstream. Legacy files without markers are migrated automatically. Pre-sync backup protects existing content.
- **Code review skill hardening (v5.8)** — four new methodology sections: schema impact tracing, source/installed drift check, test suite execution, and finding reproduction requirement. Symmetric gate enforcement ensures `review.md` and `security-gate.md` stay in sync. Three sibling reference files added via progressive disclosure.
- **Command↔skill wiring verification (v5.7)** — new `lib/wiring-check.js` verifies every artifact type declared in a skill's `## Required Artifacts` table has a corresponding output slot in the invoking command. Two new structural conventions: `## Skill References` tables in commands, `## Required Artifacts` tables in skills.
- **Codex review hardening + known-risks (v5.6)** — four new Codex review-method rules (install-path tracing, test-truthfulness, parser edge-cases, unchanged-file scope expansion). `/implement` now instructs developers to verify handoff `known_risks` before committing GREEN. Mechanism-agnostic installer coverage contract tests.
- **Reviewer Independence (v5.5)** — code-review skill includes PRD-first methodology, hypothesis falsification, field tracing, and fixture verification. Adversarial gate roles with separate-context enforcement. `source_spec` required in `handoff.json`. Three-level test coverage (unit/integration/E2E). Skill size convention with progressive disclosure.
- **Structured handoffs** — `.claude/handoff.json` is the machine-readable pipeline contract between phases. Schema-validated by the Stop hook as a blocking gate.
- **Token usage tracking** — all sessions log to `.claude/token-usage.jsonl` with per-phase, per-iteration, per-agent attribution.
- **Memory governance** — explicit rules for what belongs in CLAUDE.md vs skills vs handoff packets, with line limits.
- **Deployment tooling** — `init.sh` and `upgrade.sh` with version tracking via `.claude/.codingagents-version`.
- **Fail-closed phase commands** — Phases 2-7 resolve the feature through `resolve-feature.cjs` and stop on malformed args or mismatches.
- **Codex review layer** (optional) — independent cross-model review at four pipeline checkpoints.
- **Baseline metrics** — budget targets per phase with reporting script.

## Current release line

- Canonical major line: `5.x`
- Generation baseline: `5.0.0` from `version5-codex+token-governance`
- Current published release: `5.11.0`

`5.11.0` adds the new `invariants-audit` skill for cross-layer semantic review and renames the four hook helpers from `.js` to `.cjs` so they work in consumer projects with `"type": "module"`. `5.10.0` (immediately prior) hardened Phase 3 test-design quality with five new test-quality rules.

**Upgrade warning:** `5.11.0` renames installed hook helpers from `.js` to `.cjs`. `upgrade.sh` removes the legacy `.js` files automatically and rewrites `.claude/settings.json` to point at `.cjs`. After upgrading, verify `.claude/helpers/` contains only `.cjs` files and that `.claude/settings.json` references match. As always, upgrading in the middle of an active feature cycle is discouraged when gates or required artifacts change.

See [RELEASE.md](RELEASE.md) for the canonical `5.x` mapping and release-process rules, and [QUICKSTART.md](QUICKSTART.md) for operator-safe upgrade guidance.

## Quick setup

### Automated (recommended)

```bash
# From your target project root:
bash /path/to/codingagents/init.sh

# With Codex review layer:
bash /path/to/codingagents/init.sh --codex

# With section-level CLAUDE.md sync (v5.9+):
bash /path/to/codingagents/init.sh --sync-claude-md
```

This copies all roles, commands, skills, hooks, schemas, shared `docs/design` and `docs/memory` context, and configuration in one step. It creates the directory structure, updates `.gitignore` with runtime artifact patterns, and writes a version file.

After running, edit `CLAUDE.md` to fill in your project-specific sections.

**Note:** Hook helpers ship with the `.cjs` extension as of v5.11 — they work in both ESM (`"type": "module"`) and CommonJS projects without further configuration.

### Upgrading from v4.1

```bash
bash /path/to/codingagents/upgrade.sh          # pipeline only
bash /path/to/codingagents/upgrade.sh --codex   # pipeline + Codex review layer
bash /path/to/codingagents/upgrade.sh --sync-claude-md  # sync managed CLAUDE.md sections
```

This backs up `.claude/` before replacing framework files. It also refreshes the shared `docs/design/` and `docs/memory/` files used by fresh sessions. `CLAUDE.md` is not touched — review it manually for new sections (Phase Handoff Protocol, Memory & Instruction Governance).

Before upgrading, check whether you are in the middle of an active feature cycle. Releases that add gates or required artifacts can invalidate in-flight outputs. The current example is `5.11.0`, which renames hook helpers from `.js` to `.cjs` and updates `.claude/settings.json` to match.

### Manual setup

Use [QUICKSTART.md](QUICKSTART.md) for detailed setup, manual-install fallback, and safe operator workflows.

---

## Running a feature cycle

```bash
claude                          # start Claude Code

/status                         # always run first — shows where you are

/effort high                    # recommended for specify + architect
/plan                           # enable plan mode for alignment before writing
/specify Add user auth flow     # Phase 1 — writes docs/features/user-auth/prd.md (~3K tokens, Haiku)
/architect user-auth            # Phase 2 — writes architecture doc (~8K tokens, Opus)
# ↑ switch back: /effort medium and exit plan mode for remaining phases ↑
/test-design user-auth          # Phase 3 — writes failing tests (~10K tokens, Sonnet)
/security-gate user-auth        # Phase 4 — writes security audit (~6K tokens, Opus)
/implement user-auth            # Phase 5 — TDD red/green/refactor (~25K tokens, Sonnet)
# ↑ quit and start a fresh session before review ↑
/review user-auth               # Phase 6 — diff-only review (~8K tokens, Sonnet)
# ↑ after PR merged ↑
/document user-auth             # Phase 7 — changelog + CLAUDE.md update (~3K tokens, Haiku)
```

**Total: ~63K tokens first pass.** Budget allows ~20K for retry overhead (~83K combined target).

Advancing phases write `.claude/handoff.json` at completion. The Stop hook validates it as a blocking gate — the pipeline cannot proceed without a valid handoff, and failed gates intentionally preserve the previous handoff instead of moving forward.

This section shows the happy path. For:

- exact slash-command invocation rules
- where natural language belongs vs slug-only commands
- what to do when Phase 4 or Phase 6 blocks
- safe resume patterns with `/status`

continue in [QUICKSTART.md](QUICKSTART.md).

---

## Structured handoffs

Every advancing phase writes `.claude/handoff.json` at the end of its phase with:

| Field | Required | Description |
|---|---|---|
| `feature` | Yes | Feature name or ID |
| `phase` | Yes | Pipeline phase number (1-7) |
| `goal` | Yes | What the next agent should accomplish |
| `scope` | Yes | What is in scope for the next phase |
| `relevant_files` | Yes | Files the next agent should read first |
| `acceptance_criteria` | Yes | ACs that carry forward |
| `verification_commands` | Yes | Commands to verify the next phase's output |
| `source_spec` | Yes | Path to source specification (PRD or ticket) for reviewer verification |
| `constraints` | No | Hard constraints for the next phase |
| `known_risks` | No | Open questions or risks |
| `produced_by` | No | Agent role that produced this handoff |
| `timestamp` | No | ISO 8601 timestamp |

The schema is defined in `schemas/handoff.schema.json`. The `checkpoint.cjs` Stop hook performs full schema validation (type checks, range constraints, unexpected property rejection) and exits with a non-zero code if validation fails. Phase 4 with `BLOCKING` findings and Phase 6 with `REQUEST_CHANGES` intentionally keep the previous handoff in place so the pipeline cannot advance past a failed gate.

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
| `/session-note` before ending a long session | Writes a human-readable note for resuming work (not a pipeline handoff) |
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
| `tdd` | implement, test-design | RED/GREEN/REFACTOR cycle, Arrange/Act/Assert, property-based testing, symmetric coverage, contract robustness (v5.10) |
| `security-audit` | security-gate | OWASP Top 10 checklist, serverless threat vectors, auth verification, severity levels |
| `structured-logging` | implement, security-gate | Structured log format, log levels, PII scrubbing, security event requirements |
| `code-review` | review | Reviewer Independence, source-spec-first verification, schema impact tracing, drift check, test execution, reproduction requirement, symmetric gate enforcement, conventional comments, finding cap |
| `invariants-audit` | review, architect, security-gate, test-design | Cross-layer semantic review (v5.11) — 5-step invariant analysis, 5 review categories, sibling reference for category detail |
| `release-docs` | document | Changelog format, release notes template, process learnings, CLAUDE.md updates |
| `backlog-management` | all phases | Backlog ticket format, ordering, lifecycle conventions (open → in-progress → closed) |
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
Phase 1 → prd.md               ───→  Codex: review-prd
Phase 2 → architecture.md      ───→  Codex: review-architecture
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
| `codex/reviewers/review-test-design.md` | `tests/contracts/`, `tests/e2e/`, `docs/features/<feature>/prd.md` | Code review validated |
| `codex/reviewers/review-architecture.md` | `docs/features/<feature>/architecture.md`, `docs/features/<feature>/prd.md` | Test design review validated |
| `codex/reviewers/review-prd.md` | `docs/features/<feature>/prd.md` | Architecture review validated |

Keep each Codex run scoped to one artifact and one review file. If findings flow back into the Claude pipeline, cap the injected summary at 500 tokens.

---

## Context management hooks

The three hook scripts in `hooks/` handle context preservation, structured handoffs, and token tracking.

**`restore-context.cjs`** (SessionStart hook) — loads `.claude/handoff.json` as primary context if available (feature, goal, scope, files to read, acceptance criteria). Falls back to archived turns when no handoff exists. Records session start time and feature for token tracking.

**`archive-context.cjs`** (PreCompact hook) — fires before Claude auto-compacts the context. Scores each conversation turn for importance (architecture decisions, errors, constraints score higher), saves the top 50 turns to `.claude/context-archive/turns.json`. Logs a token usage snapshot before compaction.

**`checkpoint.cjs`** (Stop hook) — fires when a session ends. Validates `.claude/handoff.json` as a **blocking gate** (exits with error if missing or invalid). It detects the completed phase from pipeline artifacts, uses handoff metadata for feature and agent attribution, logs token usage with iteration counting, and writes `.claude/pipeline-checkpoint.json` with the next recommended action.

(All four hooks use the `.cjs` extension as of v5.11 — see [Versioning](#versioning) below.)

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
| Reusable procedures | `skills/*.md` | On demand | ~150 prose lines (250 total triggers split) |
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

## Repo structure

```
├── CLAUDE.md                        ← Root router; auto-loaded by every Claude Code session
├── PIPELINE.md                      ← Full pipeline reference with token budgets and baseline metrics
├── QUICKSTART.md                    ← Operator quickstart for install, invocation, and resume patterns
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
│   ├── backlog-management/SKILL.md  ← Backlog ticket format, ordering, and lifecycle conventions
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
│   └── session-note.md              → /session-note
│
├── schemas/                         ← Schema definitions
│   └── handoff.schema.json          ← Handoff artifact schema (copied to target projects)
│
├── hooks/                           ← Lifecycle hooks
│   ├── settings.json                ← Claude Code hook config (copy to .claude/)
│   ├── archive-context.cjs          ← PreCompact: archives turns + logs token snapshot
│   ├── restore-context.cjs          ← SessionStart: loads handoff.json or archived turns
│   ├── checkpoint.cjs               ← Stop: validates handoff (blocking), logs tokens, detects phase
│   └── resolve-feature.cjs          ← Helper for Phases 2-7: resolves feature slug safely from args/handoff
│
├── lib/                             ← Shared library modules
│   ├── wiring-check.js              ← Command↔skill artifact wiring verification (v5.7)
│   └── sync-claude-md.sh            ← Section-level CLAUDE.md sync library (v5.9)
│
├── init.sh                          ← New project setup script
├── upgrade.sh                       ← Existing project migration script
├── migrations/                      ← Version-specific migration logic
│   └── v4.1-to-v5.sh
├── .gitignore-template              ← Runtime artifact patterns for target projects
├── release-notes/                   ← Generated release notes from Phase 7 documentation
├── tests/                           ← Regression tests and contract checks for pipeline behavior
│   ├── node/                        ← Node-based contract/unit tests for helpers and commands
│   ├── contracts/                   ← Contract tests (behavioral verification via structural anchors)
│   ├── integration/                 ← Integration tests (cross-module verification)
│   ├── e2e/                         ← End-to-end tests (full convention chain)
│   ├── fixtures/                    ← Stable fixtures for handoff/review/security/wiring tests
│   └── test-*.sh                    ← Shell-level install and command contract checks
│
├── docs/                            ← Shared design docs, cross-agent memory, and repo-specific instructions
│   ├── CLAUDE.md                        ← Framework development instructions (repo-local only)
│   ├── design/
│   │   ├── v5-implementation-record.md  ← What shipped in v5 (implementation reference)
│   │   └── vnext-recommendations.md     ← What's left for vNext (Tier 2/3 + stretch goals)
│   ├── features/                       ← Per-feature artifacts and review outputs generated by the pipeline
│   ├── issues/                         ← Backlog, in-progress, closed tickets, and ticket files
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

## Versioning

- **v1** — initial Gemini-drafted role definitions
- **v2** — added `disallowedTools`, verifiable DoD with shell commands, `## Constraints` tables, CLAUDE.md router, `memory: project` on Architect and Docs Specialist
- **v3** — phase-gated pipeline, model tier assignments, slash commands, lifecycle hooks, token budget documentation
- **v4** — extracted skills from roles (separation of concerns), YAML frontmatter on all commands for VS Code, standardised output paths (`docs/reviews/`, `docs/security/`), release notes generation in documentation phase, verification-gate skill for all phases
- **v4.1** — new structured-logging skill (cross-cutting: architect, security, developer, reviewer), retrospective protocol for self-improving feedback loops, conventional comments format in code-review, property-based testing in TDD, architectural fitness functions, serverless/edge threat vectors in security-audit, process learnings in release-docs
- **v5 (current)** — structured handoff.json with schema validation (blocking gate), token usage tracking with JSONL logging and iteration awareness, memory governance rules, deployment tooling (`init.sh`/`upgrade.sh` with v4.1 migration), optional Codex review layer with shared metrics, baseline metrics and budget targets in `PIPELINE.md`, artifact-based phase detection, and improved agent/model attribution in token logs. v5.2+ added artifact timestamps. v5.3 added skill size convention with progressive disclosure. v5.4 added three-level test coverage (unit/integration/E2E). v5.5 added reviewer independence, adversarial gate roles, separate-context enforcement, and source_spec-anchored reviews. v5.6 hardened Codex review methods and added known-risks verification in `/implement`. v5.7 added command↔skill wiring verification with `lib/wiring-check.js`. v5.8 hardened code-review skill with schema impact tracing, drift checks, reproduction requirements, and symmetric gate enforcement. v5.9 added CLAUDE.md section-level sync via `--sync-claude-md` flag. v5.10 added the QA test quality rules (symmetric testing, behavioral binding, negative-pattern testing, adversarial contract testing, artifact-type test strategy) and `[symmetric-coverage]` / `[contract-robustness]` entries in the TDD skill. v5.11 added the `invariants-audit` skill for cross-layer semantic review and renamed all hook helpers from `.js` to `.cjs` (ISS-055) for ESM-project compatibility.

---

## Contributing

There are three levels of customisation, from lowest effort to most impactful:

**1. Extension Points in roles** — fill in the `## Extension Points` section at the bottom of each role file with your project's specific stack, conventions, and forbidden patterns. The more specific those sections, the less correction you'll need on agent outputs.

**2. Skill refinement** — each `SKILL.md` contains templates, checklists, and procedures. Editing a skill immediately improves every agent that references it. For example, adding your project's lint rules to `skills/tdd/SKILL.md` means every `/implement` session automatically follows them.

**3. CLAUDE.md** — the highest-leverage file in the system. Every agent session starts by reading it. Keep it current using the `/document` command after each feature merge.
