# codingagents

A token-efficient, phase-gated multi-agent development pipeline for Claude Code and other agentic LLMs. Eight specialised role definitions, eight reusable skills, nine slash commands, and three lifecycle hooks that reduce token usage by ~3–4× compared to unstructured single-session coding.

---

## What this is

A complete system for structuring AI-assisted software development around a seven-phase pipeline. Each phase runs in its own isolated context, reads only the output of the previous phase, and uses the cheapest model capable of the task. The result: roughly **63K tokens per feature cycle** instead of the typical 200K–400K from ad-hoc sessions.
```
Phase 1  SPECIFY        product-owner + ux-designer   → docs/features/<feature>/prd.md           (Haiku)
Phase 2  ARCHITECT      architect                      → docs/features/<feature>/architecture.md  (Opus)
Phase 3  TEST DESIGN    qa                             → tests/ failing shells                    (Sonnet)
Phase 4  SECURITY GATE  security-reviewer              → docs/features/<feature>/security-audit.md (Opus)
Phase 5  IMPLEMENT      developer                      → src/ via TDD                             (Sonnet)
Phase 6  REVIEW         code-reviewer (fresh context)  → docs/features/<feature>/review.md         (Sonnet)
Phase 7  DOCUMENT       documentation-specialist       → CHANGELOG + release-notes                 (Haiku)
```

**Core principle:** Agents pass files, not conversation history. Each phase produces one compact artifact. The next phase reads only that artifact — not the full codebase, not the prior conversation.

---

## Repo structure
```
├── CLAUDE.md                        ← Root router; auto-loaded by every Claude Code session
├── PIPELINE.md                      ← Full pipeline reference with token budgets
├── HOW_TO_USE.md                    ← Setup guide and session discipline rules
│
├── ROLE_ARCHITECT.md                ← Phase 2 — Opus, irreversible decisions
├── ROLE_CODE_REVIEWER.md            ← Phase 6 — Sonnet, fresh context only
├── ROLE_DEVELOPER.md                ← Phase 5 — Sonnet, TDD: red/green/refactor
├── ROLE_DOCUMENTATION_SPECIALIST.md ← Phase 7 — Haiku, changelog + CLAUDE.md
├── ROLE_PRODUCT_OWNER.md            ← Phase 1 — Haiku, spec and acceptance criteria
├── ROLE_QA.md                       ← Phase 3 — Sonnet, write failing tests first
├── ROLE_SECURITY.md                 ← Phase 4 — Opus, design-time audit
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
│   └── verification-gate/SKILL.md   ← Phase verification, retrospective protocol
│
├── commands/                        ← Slash commands — one per pipeline phase (YAML frontmatter for VS Code)
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
└── hooks/                           ← Lifecycle hooks for context management
    ├── settings.json                ← Claude Code hook config (copy to .claude/)
    ├── archive-context.js           ← PreCompact: saves high-value turns before compaction
    ├── restore-context.js           ← SessionStart: restores top-scored turns
    └── checkpoint.js                ← Stop: detects pipeline phase, prints next action
```

---

## Quick setup
```bash
# 1. Copy role files to .claude/agents/
mkdir -p .claude/agents
cp ROLE_*.md .claude/agents/

# 2. Copy skills to .claude/skills/
cp -r skills/ .claude/skills/

# 3. Copy commands to .claude/commands/
mkdir -p .claude/commands
cp commands/*.md .claude/commands/

# 4. Copy hooks to .claude/helpers/ and config to .claude/
mkdir -p .claude/helpers
cp hooks/archive-context.js hooks/restore-context.js hooks/checkpoint.js .claude/helpers/
cp hooks/settings.json .claude/settings.json

# 5. Copy CLAUDE.md to your project root and fill in your stack details
cp CLAUDE.md ./CLAUDE.md

# 6. Create output directory for pipeline artifacts
mkdir -p docs/features docs/decisions

# 7. Commit
git add .claude/ CLAUDE.md docs/ && git commit -m "chore: add multi-agent pipeline"
```

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

**Total: ~63K tokens.** Unstructured single-session equivalent: 200K–400K tokens.

---

## Session discipline

| Rule | Why |
|------|-----|
| Fresh session per pipeline phase | Prevents prior context from polluting the current task |
| `/compact` at 60% context | Auto-compaction loses context silently — manual is safer |
| `/handoff` before ending a long session | Writes a note the next session can read to resume |
| `/status` at the start of each session | Detects pipeline phase from file existence, prints next action |
| Never load more than 10 files per session | More than 10 means you're doing too much at once — split the task |

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

Skills are the key architectural concept in v4. Each skill is a standalone `SKILL.md` file containing reusable execution procedures — the **HOW** of a task. Roles define the **WHO** (identity, constraints, model tier), and commands define the **WHEN** (which phase to trigger). This separation gives you three benefits:

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
| `verification-gate` | all phases | Phase-specific verification, universal checklist, no-go criteria, retrospective protocol |

Each command file contains a `Load skill:` directive that tells the agent which skill to read at the start of the phase. The agent reads the skill, executes its procedures, and produces the phase artifact.

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

## Token antipatterns this system prevents

| Antipattern | Typical cost | This system's fix |
|-------------|-------------|-------------------|
| One session for the whole feature | 200K–400K tokens | 7 isolated phase sessions |
| Architect reads all of `src/` | +50K tokens | Architect reads prd.md + CLAUDE.md only |
| Developer reads entire codebase before coding | +30K tokens | Developer reads ARCH doc + test files only |
| Code reviewer opens every file in changed modules | +40K tokens | Reviewer reads `git diff` only |
| Opus for changelogs and template fills | 15× markup | Haiku for all mechanical/structured tasks |
| Every role carries full procedure docs | +20K tokens/session | Skills loaded on demand; roles are ~100 lines |
| Silent context loss on auto-compaction | Loses history | PreCompact hook archives before compaction |

---

## Context management hooks

The three hook scripts in `hooks/` address the most painful real-world problem: losing context between sessions.

**`archive-context.js`** (PreCompact hook) — fires before Claude auto-compacts the context. Scores each conversation turn for importance (architecture decisions, errors, constraints score higher), saves the top 50 turns to `.claude/context-archive/turns.json`.

**`restore-context.js`** (SessionStart hook) — fires when a new session starts. Reads the archive, injects the top 5 highest-scored turns as `additionalContext` (capped at 2K tokens so it doesn't itself become expensive).

**`checkpoint.js`** (Stop hook) — fires when a session ends. Detects the current pipeline phase from which artifact files exist, writes `.claude/pipeline-checkpoint.json`, and prints the next recommended action so it's visible in the session transcript.

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

---

## Contributing

There are three levels of customisation, from lowest effort to most impactful:

**1. Extension Points in roles** — fill in the `## Extension Points` section at the bottom of each role file with your project's specific stack, conventions, and forbidden patterns. The more specific those sections, the less correction you'll need on agent outputs.

**2. Skill refinement** — each `SKILL.md` contains templates, checklists, and procedures. Editing a skill immediately improves every agent that references it. For example, adding your project's lint rules to `skills/tdd/SKILL.md` means every `/implement` session automatically follows them.

**3. CLAUDE.md** — the highest-leverage file in the system. Every agent session starts by reading it. Keep it current using the `/document` command after each feature merge.