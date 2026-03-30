Here is the compacted context. Save this as a note or paste it at the start of a new conversation to resume without losing anything.

---

## codingagents — Session Context

**Repo:** `github.com/linoyalex/codingagents` — private. V3 files produced this session, need to be pushed via git CLI.

---

## What was built: V1 → V2 → V3

- **V1** — Initial Gemini drafts, basic role descriptions
- **V2** — Added `disallowedTools`, verifiable DoD with shell commands, `## Constraints` tables, `CLAUDE.md` router, `memory: project` on Architect and Docs Specialist, `version` frontmatter field
- **V3** — Phase-gated pipeline, model tier assignments, slash commands, lifecycle hooks, token budget documentation

---

## V3 File Inventory

**Root files:** `README.md`, `CLAUDE.md`, `HOW_TO_USE.md`, `PIPELINE.md`

**Role files (8):** `ROLE_DEVELOPER.md`, `ROLE_ARCHITECT.md`, `ROLE_QA.md`, `ROLE_SECURITY.md`, `ROLE_PRODUCT_OWNER.md`, `ROLE_UX_DESIGNER.md`, `ROLE_CODE_REVIEWER.md`, `ROLE_DOCUMENTATION_SPECIALIST.md`

Each role file has: YAML frontmatter (`name`, `version`, `description`, `tools`, `disallowedTools`, `model`), Pipeline Phase section, Core Mandate, Constraints table, Responsibilities, Definition of Done with verification shell commands, Gotchas, Extension Points.

**Commands (9) in `commands/`:** `specify.md`, `architect.md`, `test-design.md`, `security-gate.md`, `implement.md`, `review.md`, `document.md`, `status.md`, `handoff.md` — all use `$ARGUMENTS` as the variable placeholder.

**Hooks (4) in `hooks/`:** `settings.json`, `archive-context.js`, `restore-context.js`, `checkpoint.js` — pure Node.js, plain JSON storage at `.claude/context-archive/turns.json`. No SQLite, no Ruflo required. `PreCompact`, `SessionStart`, and `Stop` are native Claude Code lifecycle events.

---

## The Pipeline

| Phase | Agent(s) | Model | Reads | Writes |
|-------|----------|-------|-------|--------|
| 1 SPECIFY | product-owner + ux-designer | **Haiku** | Feature request only | `docs/prd.md` |
| 2 ARCHITECT | architect | **Opus** | prd.md + CLAUDE.md arch section | `docs/architecture/ARCH-[feature].md` |
| 3 TEST DESIGN | qa | Sonnet | prd.md + ARCH doc only (not src/) | Failing test shells |
| 4 SECURITY GATE | security-reviewer | **Opus** | prd.md + ARCH doc only (not src/) | `docs/security-audit-[feature].md` |
| 5 IMPLEMENT | developer | Sonnet | ARCH doc + test files only | src/ via TDD red→green→refactor |
| 6 REVIEW | code-reviewer (fresh context) | Sonnet | `git diff` only | `docs/review-[branch].md` |
| 7 DOCUMENT | documentation-specialist | **Haiku** | prd.md + CHANGELOG + CLAUDE.md | Updated CHANGELOG + CLAUDE.md |

**Token target: ~63K per feature cycle** vs 200K–400K unstructured.

---

## Key Design Principles

1. **LLMs are stateless** — context window is the entire input, rebuilt every call, cost scales with size
2. **Agents = LLM + tools in a loop** — `disallowedTools` is a hard wall, not a soft instruction
3. **Subagents isolate context** — each runs in its own window, returns a summary, main session stays clean
4. **Model cost matches decision reversibility** — Haiku for templates, Sonnet for coding, Opus only for irreversible decisions (architecture, security)
5. **Agents pass files, not conversation history** — the single biggest token efficiency lever; a 200-line handoff file costs 2K tokens vs 100K+ for full conversation history
6. **YAML frontmatter `description` field = trigger** — Claude Code reads this to decide when to auto-invoke an agent; write it as "when should I fire?" not a summary
7. **Slash commands = encoded protocols** — `$ARGUMENTS` is the variable; the body is the full instructions including what to read, write, and print when done
8. **Hooks fire outside the context window** — `PreCompact`, `SessionStart`, `Stop` are native Claude Code events; stdout from `SessionStart` hooks becomes `additionalContext`
9. **`CLAUDE.md` is the highest-leverage file** — loaded into every session automatically; agents inherit everything in it; owned by the documentation-specialist agent
10. **TDD enforces objective completion** — RED commit proves tests test something; GREEN proves correctness; REFACTOR improves quality; agents can't self-declare done

---

## Agentic Coding Resources

### Use directly
| Resource | What to take |
|----------|-------------|
| **Ruflo** (`github.com/ruvnet/ruflo`) | PreCompact/SessionStart hooks for context archiving. Run `npx ruflo@latest init` and keep only the hooks config. Full framework (313 MCP tools, SQLite, WASM) is optional. |
| **shanraisshan/claude-code-best-practice** (`github.com/shanraisshan/claude-code-best-practice`) | `context: fork` for parallel subagents, skill folders with progressive disclosure, slash command conventions, Gotchas-first skill design |
| **Anthropic Claude Code docs** (`code.claude.com/docs`) | Authoritative source for subagent YAML frontmatter fields. Only `name` and `description` are required. |
| **Anthropic: Building Effective Agents** (`anthropic.com/research/building-effective-agents`) | First-principles explanation of why the file-passing handoff architecture works |

### Adopt the patterns, not the full framework
| Resource | Pattern worth taking | What to skip |
|----------|---------------------|-------------|
| **Ruflo** | PreCompact + SessionStart hooks; importance-scored context archiving | 313 MCP tools, swarm orchestration, SQLite backend |
| **SPARC methodology** (in Ruflo/Claude Flow) | Specification → Pseudocode → Architecture → Refinement → Completion — maps to Phases 1–5 | CLI tooling; use native Claude Code slash commands instead |
| **PubNub subagent pipeline** | pm-spec → architect-review → implementer-tester chain with explicit file handoffs; SubagentStop hooks to print next action | PubNub-specific MCP servers |

**Key insight:** Ruflo's core value is three architectural patterns — agents pass structured file artifacts between phases, importance-ranked context archiving before compaction, and intelligent model routing by task complexity. All three are implemented in the v3 system without requiring Ruflo itself.