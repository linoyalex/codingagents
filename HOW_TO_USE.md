# Multi-Agent Role System v3 — How to Use

## What changed from v2

v2 was a set of well-defined role files. v3 adds a **phase-gated pipeline** that controls
*when* each agent runs, *what it reads*, and *which model tier it uses*. The result is
roughly 3–4× fewer tokens per feature cycle without sacrificing output quality.

The core insight: **agents pass files, not conversation history.**

---

## Repo structure

```
your-project/
├── CLAUDE.md                          ← Root router; read by every session automatically
├── docs/
│   └── features/
│       └── [feature]/
│           ├── prd.md                 ← Phase 1 output (product-owner + ux-designer)
│           ├── architecture.md        ← Phase 2 output (architect)
│           ├── security-audit.md      ← Phase 4 output (security-reviewer)
│           └── review.md             ← Phase 6 output (code-reviewer)
├── tests/
│   ├── contracts/[feature].test.ts    ← Phase 3 output — fail before implementation
│   └── e2e/[feature].spec.ts          ← Phase 3 output — fail before implementation
└── .claude/
    ├── agents/                        ← Drop all ROLE_*.md files here
    │   ├── ROLE_DEVELOPER.md
    │   ├── ROLE_ARCHITECT.md
    │   ├── ROLE_QA.md
    │   ├── ROLE_CODE_REVIEWER.md
    │   ├── ROLE_SECURITY.md
    │   ├── ROLE_PRODUCT_OWNER.md
    │   ├── ROLE_UX_DESIGNER.md
    │   └── ROLE_DOCUMENTATION_SPECIALIST.md
    ├── commands/                      ← Drop all command .md files here
    │   ├── specify.md                 → /specify [feature description]
    │   ├── architect.md               → /architect [feature-name]
    │   ├── test-design.md             → /test-design [feature-name]
    │   ├── security-gate.md           → /security-gate [feature-name]
    │   ├── implement.md               → /implement [feature-name]
    │   ├── review.md                  → /review [feature-name]
    │   ├── document.md                → /document [feature-name]
    │   ├── status.md                  → /status
    │   └── handoff.md                 → /handoff
    ├── helpers/
    │   ├── archive-context.js         ← PreCompact hook
    │   ├── restore-context.js         ← SessionStart hook
    │   └── checkpoint.js              ← Stop hook
    ├── settings.json                  ← Hook configuration
    ├── pipeline-checkpoint.json       ← Auto-written by Stop hook
    ├── handoff-note.md                ← Written by /handoff command
    └── context-archive/
        └── turns.json                 ← Written by PreCompact hook
```

---

## Setup (one-time)

```bash
# 1. Copy all ROLE_*.md files to .claude/agents/
mkdir -p .claude/agents
cp ROLE_*.md .claude/agents/

# 2. Copy all command files to .claude/commands/
mkdir -p .claude/commands
cp commands/*.md .claude/commands/

# 3. Copy hooks to .claude/helpers/
mkdir -p .claude/helpers
cp hooks/archive-context.js .claude/helpers/
cp hooks/restore-context.js .claude/helpers/
cp hooks/checkpoint.js .claude/helpers/

# 4. Copy settings.json to .claude/
cp hooks/settings.json .claude/settings.json

# 5. Copy CLAUDE.md to project root and fill in your project details
cp CLAUDE.md ./CLAUDE.md
# Edit: project overview, stack, commands, conventions, constraints, gotchas

# 6. Create output directories for pipeline artifacts
mkdir -p docs/features docs/decisions

# 7. Commit everything
git add .claude/ CLAUDE.md docs/
git commit -m "chore: add multi-agent pipeline"
```

---

## Running a feature cycle

```bash
# Start Claude Code
claude

# Check where you are (useful when resuming)
/status

# Phase 1 — write the spec (haiku, ~3K tokens)
/specify Add outfit recommendation feature that suggests 3 outfits from uploaded clothing

# Phase 2 — design the architecture (opus, ~8K tokens)
/architect outfit-recommendations

# Phase 3 — write failing tests (sonnet, ~10K tokens)
/test-design outfit-recommendations

# Phase 4 — security audit the design (opus, ~6K tokens)
/security-gate outfit-recommendations

# Phase 5 — TDD implement (sonnet, ~25K tokens)
# ⚠️  If context > 60%, run /compact then continue
/implement outfit-recommendations

# Phase 6 — code review (sonnet, ~8K tokens)
# ⚠️  MUST be a fresh session — quit and restart Claude Code first
/review outfit-recommendations

# After PR merged:
# Phase 7 — update docs (haiku, ~3K tokens)
/document outfit-recommendations
```

**Total: ~63K tokens.** Compare to an unstructured single session: 200K–400K tokens.

---

## Session discipline

| Rule | Why |
|------|-----|
| Start a fresh session for each pipeline phase | Prevents context from prior phases polluting the current task |
| Run `/compact` at 60% context | Auto-compaction loses context silently; manual is safer |
| Run `/handoff` before ending a long session | Writes a compact note the next session can read to resume |
| Run `/status` at the start of each session | Tells you exactly where you are and what to do next |
| Never load more than 10 files in one session | If you need more, you're doing too much at once — split the task |

---

## Model tier reference

| Agent | Model | Rationale |
|-------|-------|-----------|
| product-owner | **Haiku** | Structured template filling |
| ux-designer | **Haiku** (Sonnet for deep audits) | Template filling for new specs |
| architect | **Opus** | Irreversible structural decisions |
| qa | **Sonnet** | Complex but correctable |
| security-reviewer | **Opus** | Asymmetric cost of a miss |
| developer | **Sonnet** | Iterative, correctable |
| code-reviewer | **Sonnet** | Pattern matching |
| documentation-specialist | **Haiku** (Sonnet for complex rewrites) | Mechanical template updates |

---

## Token antipatterns to avoid

| What NOT to do | Cost | Fix |
|----------------|------|-----|
| One long session for a whole feature | 200K–400K tokens | Use the 7-phase pipeline |
| Architect reads all of `src/` | +50K tokens | Architect reads `prd.md` + `CLAUDE.md` only |
| Developer reads every existing file | +30K tokens | Developer reads architecture doc + test files only |
| Code Reviewer opens all files in changed modules | +40K tokens | Reviewer reads `git diff` only |
| Using Opus for changelog / template updates | 5× cost | Use Haiku for mechanical tasks |
| Letting auto-compaction fire without PreCompact hook | Silent context loss | Install the hooks |

---

## Recommended external resources

| Resource | What to use it for |
|----------|-------------------|
| **Ruflo** (`npx ruflo@latest init`) | Take only the PreCompact/SessionStart hooks — best context archiving available |
| **shanraisshan/claude-code-best-practice** | Slash command patterns, `context: fork` for parallel agents |
| **Anthropic: Building Effective Agents** | First-principles explanation for why this pipeline works |
| **SPARC methodology** (in Ruflo/Claude Flow) | Alternative naming for the same pipeline: Specification → Pseudocode → Architecture → Refinement → Completion |
