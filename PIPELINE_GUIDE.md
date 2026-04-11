# Token-Efficient Agent Pipeline

## Core Philosophy

**Agents pass files, not conversation history.**

Every phase gate produces one compact artifact file. The next phase reads only that file —
not the full conversation, not the codebase, not every role definition. This is the single
biggest driver of token efficiency. A 200-line handoff file costs 2K tokens. A full
conversation history costs 100K+.

The canonical handoff artifact is `.claude/handoff.json` — a machine-readable contract
between phases. Each advancing phase writes it at the end of its phase; the next agent reads it at
session start. The schema is defined in `schemas/handoff.schema.json`. The `checkpoint.js`
Stop hook validates its presence, and `restore-context.js` loads it as primary context for
fresh sessions.

Not every phase result advances the pipeline. When a gate fails, the current phase artifact
is still written, but the previous valid handoff remains authoritative so the next phase
cannot start accidentally. Today that applies to:
- Phase 4 when the security audit contains `BLOCKING` findings
- Phase 6 when review returns `REQUEST_CHANGES`

The second principle: **Opus only for irreversible decisions.** Architecture and security
choices are hard to undo. Code is easy to rewrite. Model cost should match decision reversibility.

---

## The Pipeline

```
Phase 1: SPECIFY       [product-owner, ux-designer] → docs/features/<feature>/prd.md
         ↓
Phase 2: ARCHITECT     [architect]                  → docs/features/<feature>/architecture.md
         ↓
Phase 3: TEST DESIGN   [qa]                         → tests/ (contract + E2E shells)
         ↓
Phase 4: SECURITY GATE [security-reviewer]          → docs/features/<feature>/security-audit.md
         ↓
Phase 5: IMPLEMENT     [developer] × N              → src/ (TDD: red → green → refactor)
         ↓
Phase 6: REVIEW        [code-reviewer]              → docs/features/<feature>/review.md
         ↓
Phase 7: DOCUMENT      [documentation-specialist]   → CLAUDE.md, CHANGELOG.md updated
```

**Feature naming convention:** `<feature>` is a lowercase kebab-case name derived from the
feature request (e.g. `user-auth`, `search-filters`). Phase 1 creates the directory
`docs/features/<feature>/`; all subsequent phases write to the same directory. This groups
every artifact for a feature in one browsable location.

**Slash-command invocation contract:**
- `/specify` accepts natural language and creates the feature slug.
- Phases 2-7 should be invoked with only the feature slug, e.g. `/implement user-auth`.
- If you want to add extra context after Phase 1, give it in a normal chat message and then run the slash command separately.
- Phases 2-7 resolve the feature through `.claude/helpers/resolve-feature.js`, which fails closed on malformed args, slug/handoff mismatches, or invalid fallback state.
- Empty args are allowed only as an explicit handoff-based resume when the handoff is valid and comes from the immediately previous phase.

**Models by phase:**
| Phase | Model | Why |
|-------|-------|-----|
| 1 – Specify | Haiku | Structured template filling; no deep reasoning needed |
| 2 – Architect | **Opus** | Irreversible structural decisions |
| 3 – Test Design | Sonnet | Complex but well-defined task |
| 4 – Security | **Opus** | High-stakes; asymmetric cost of a miss |
| 5 – Implement | Sonnet | Iterative, correctable |
| 6 – Review | Sonnet (fresh context) | Pattern matching, not reasoning |
| 7 – Document | Haiku | Mechanical updates to templates |

**Estimated tokens per full feature cycle:**
- Old approach (one long session): ~200K–400K tokens, Opus throughout
- This pipeline: ~60K–100K tokens total, Opus only on 2 of 7 phases

---

## Phase 1: SPECIFY
**Agents:** `product-owner` + `ux-designer`  
**Model:** `claude-haiku-4-5`  
**Trigger:** New feature request or user story  
**Reads:** Nothing except the feature request  
**Produces:** `docs/features/<feature>/prd.md`

```bash
# Invoke
claude --model claude-haiku-4-5 \
  "Use the product-owner subagent to write a PRD for: [feature description].
   Then use the ux-designer subagent to add screen states.
   Write the output to docs/features/<feature>/prd.md"
```

**`prd.md` format (keep under 150 lines):**
```markdown
## Feature: [Name]
**Phase:** Specify | Date: YYYY-MM-DD

### User Story
As a [persona], I want [action], so that [outcome].

### Acceptance Criteria
- [ ] Given..., When..., Then...

### Screen States
| Screen | Empty | Loading | Populated | Error |
|--------|-------|---------|-----------|-------|
| [Name] | ...   | ...     | ...       | ...   |

### Out of Scope
- [Explicit exclusions]

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
```

---

## Phase 2: ARCHITECT
**Agent:** `architect`  
**Model:** `claude-opus-4-6`  
**Trigger:** After `docs/features/<feature>/prd.md` is committed  
**Reads:** `docs/features/<feature>/prd.md` + `CLAUDE.md` (Architecture Notes section only)  
**Produces:** `docs/features/<feature>/architecture.md`

```bash
claude --model claude-opus-4-6 \
  "Use the architect subagent. Read docs/features/<feature>/prd.md and CLAUDE.md.
   Produce docs/features/<feature>/architecture.md.
   Do not read any source files — design only."
```

**Critical token constraint for Architect:** Read `docs/features/<feature>/prd.md` and `CLAUDE.md` only.
Do not `Glob` the entire codebase. If you need to understand an existing pattern, read
one representative file, not all files.

**`architecture.md` format (keep under 100 lines):**
```markdown
## Architecture: [Feature Name]
**ADR:** ADR-[N] | Date: YYYY-MM-DD

### Decision
[What approach, in 2–3 sentences]

### Data Model Changes
[New fields/tables only]

### API Contract
[Endpoint signatures only, no implementation]

### Module Boundaries
[Which module owns what, what it must NOT cross into]

### Failure Modes
[What happens when each external dependency fails]

### Rejected Alternatives
1. [Option] — rejected because [reason]
```

---

## Phase 3: TEST DESIGN
**Agent:** `qa`  
**Model:** `claude-sonnet-4-6`  
**Trigger:** After `docs/features/<feature>/architecture.md` is committed  
**Reads:** `docs/features/<feature>/prd.md` + `docs/features/<feature>/architecture.md` only  
**Produces:** Shell test files with failing tests (RED state)

```bash
claude --model claude-sonnet-4-6 \
  "Use the qa subagent. Read docs/features/<feature>/prd.md and docs/features/<feature>/architecture.md.
   Write contract tests and E2E test shells that will FAIL until the feature is implemented.
   Put contract tests in tests/contracts/[feature].test.ts
   Put E2E tests in tests/e2e/[feature].spec.ts
   Do not implement any production code."
```

**Token rule:** QA must NOT read `src/` during test design. Tests are derived from
the spec and architecture, not from the implementation. This enforces true TDD and
prevents the test suite from mirroring the implementation's bugs.

**What these tests cover:**
1. One test per Acceptance Criterion (happy path)
2. One test per error/empty state in the spec
3. API contract: correct request shape → correct response shape
4. Permission boundary: unauthorized user cannot access this endpoint
5. The most likely race condition identified in the architecture

---

## Phase 4: SECURITY GATE
**Agent:** `security-reviewer`  
**Model:** `claude-opus-4-6`  
**Trigger:** Before implementation begins (design-time audit)  
**Reads:** `docs/features/<feature>/prd.md` + `docs/features/<feature>/architecture.md` only  
**Produces:** `docs/features/<feature>/security-audit.md`

```bash
claude --model claude-opus-4-6 \
  "Use the security-reviewer subagent. Read docs/features/<feature>/prd.md and docs/features/<feature>/architecture.md.
   Produce docs/features/<feature>/security-audit.md.
   Do not read src/ — audit the design, not the implementation."
```

**This is a design-time audit**, not a code audit. It catches:
- Auth boundary violations in the proposed API design
- PII flowing through systems that shouldn't see it
- Missing rate limiting on new endpoints
- Data model exposures (fields that shouldn't be in API responses)

A second, shorter code-time security scan runs automatically in CI (see `hooks/`).

**Gate outcome:**
- If there are no `BLOCKING` findings, Phase 4 writes the Phase 5 handoff and the next step is `/implement <feature>`.
- If any `BLOCKING` finding exists, do **not** advance the pipeline. Keep the existing Phase 3 handoff, resolve the issues, and re-run `/security-gate <feature>`.

---

## Phase 5: IMPLEMENT (TDD: Red → Green → Refactor)
**Agent:** `developer`  
**Model:** `claude-sonnet-4-6`  
**Trigger:** After security audit is committed with no BLOCKING findings  
**Reads:** `docs/features/<feature>/architecture.md` + the failing test files  
**Produces:** Working implementation that makes all tests pass

```bash
# Pass only the relevant files — NOT the whole codebase
claude --model claude-sonnet-4-6 \
  "Use the developer subagent. Your goal: make all tests in
   tests/contracts/[feature].test.ts and tests/e2e/[feature].spec.ts pass.
   Read docs/features/<feature>/architecture.md for design constraints.
   Follow TDD: run the tests first (RED), implement minimally to make them pass (GREEN),
   then refactor for clarity (REFACTOR). Commit after each phase."
```

### TDD Cycle (enforce this sequence)

```
RED:     Run tests → confirm they all fail → commit with message "test: [feature] failing tests"
GREEN:   Write minimum code to pass → run tests → all pass → commit "feat: [feature] passing"
REFACTOR: Clean up → tests still pass → commit "refactor: [feature] cleanup"
```

**Session discipline:**
- Start a fresh session for each feature or each day, whichever comes first
- If context reaches 60%: `/compact` immediately — do not wait for auto-compaction
- Never load more than 10 files in a single session
- If you need to understand more than 10 files, you're implementing too much at once — split the feature

---

## Phase 6: REVIEW
**Agent:** `code-reviewer`  
**Model:** `claude-sonnet-4-6`  
**CRITICAL:** Fresh context — new session, not the session that wrote the code  
**Reads:** `git diff main...HEAD` (the diff only, not the full codebase)  
**Produces:** `docs/features/<feature>/review.md`

```bash
# In a new Claude Code session
claude --model claude-sonnet-4-6 \
  "Use the code-reviewer subagent. Run: git diff main...HEAD
   Review only the changed files.
   Write your findings to docs/features/<feature>/review.md"
```

**Token rule:** Code Reviewer reads the diff via `git diff`, not by opening every file.
If a finding requires understanding context, read that one file — not the module it belongs to.

**Gate outcome:**
- If the verdict is `APPROVE`, Phase 6 writes the Phase 7 handoff and the next step is `/document <feature>` after merge.
- If the verdict is `REQUEST_CHANGES`, do **not** advance the pipeline. Keep the existing Phase 5 handoff, address the findings, and re-run `/review <feature>` in a fresh session.

---

## Phase 7: DOCUMENT
**Agent:** `documentation-specialist`  
**Model:** `claude-haiku-4-5`  
**Trigger:** After PR is merged  
**Reads:** `docs/features/<feature>/prd.md` + `CHANGELOG.md` + `CLAUDE.md` + latest `release-notes/`  
**Produces:** Updated `CHANGELOG.md`, `release-notes/` entry, updated `CLAUDE.md` if conventions changed

```bash
claude --model claude-haiku-4-5 \
  "Use the documentation-specialist subagent.
   Read docs/features/<feature>/prd.md to understand what changed.
   Update CHANGELOG.md with the new entry.
   Create a release note in release-notes/ following the Release Notes Template.
   If any new conventions were established, update the Conventions section of CLAUDE.md.
   Do not read src/."
```

---

## CI/CD Hooks (Automatic, Zero Extra Sessions)

These run as Claude Code hooks or GitHub Actions — they cost tokens but are **batch runs**
(no interactive session overhead):

```bash
# .claude/hooks/pre-commit (runs on every commit)
#!/bin/bash
pnpm lint && pnpm typecheck && pnpm test
# Haiku-tier: these are deterministic — no LLM needed

# .claude/hooks/on-pr (runs on every PR)
#!/bin/bash
# 1. Run full test suite
pnpm test:e2e
# 2. Run dependency security audit (no LLM)
npm audit --audit-level=high
# 3. Quick LLM-based diff scan for secrets (Haiku, read-only)
claude -p "Scan this diff for any hardcoded secrets: $(git diff main...HEAD)" \
  --model claude-haiku-4-5 \
  --allowedTools "Bash(git diff *)"
```

---

## Baseline Metrics

Before making changes to the pipeline, capture these metrics across 1-2 feature cycles to establish a true baseline. All metrics are logged automatically to `.claude/token-usage.jsonl` when token tracking hooks are installed.

### What to measure

| Metric | How to capture | Why it matters |
|---|---|---|
| Total tokens per feature cycle | Sum all JSONL entries for the feature (per phase and aggregate) | Validates whether the ~63K target is being met |
| Retry overhead | Count iterations > 1 per phase; sum their token costs separately | Shows rework cost distinct from first-pass quality |
| Wall-clock latency per phase | `duration_seconds` field in each JSONL entry | Identifies slow phases that may need model/effort changes |
| Verification pass rate | `verification_passed` field — percentage of phases passing tests/lint on first run | Low pass rate signals spec or test quality issues upstream |
| Handoff size | Token count of context passed between phases (handoff.json + any addenda) | Large handoffs erode the token savings from phase isolation |
| Escaped defects | Issues found in later phases that should have been caught earlier | Signals which phase gates need strengthening |

### Budget targets

| Phase | Model | Token budget (first pass) |
|---|---|---|
| 1 – Specify | Haiku | ~3K |
| 2 – Architect | Opus | ~8K |
| 3 – Test Design | Sonnet | ~10K |
| 4 – Security Gate | Opus | ~6K |
| 5 – Implement | Sonnet | ~25K |
| 6 – Review | Sonnet | ~8K |
| 7 – Document | Haiku | ~3K |
| **First-pass total** | | **~63K** |
| **Retry allowance** | | **~20K** |
| **Combined target** | | **~83K** |

Per-phase budgets apply to iteration 1 only. Retries are tracked but not individually capped. If retry overhead consistently exceeds the allowance, the fix is upstream (better specs, better test design), not downstream.

### Codex review layer (optional, additive)

| Review checkpoint | Token budget |
|---|---|
| Code review (initial) | ~4-6K |
| Security review (after code review or before merge) | ~4-6K |
| Test design review (after code review validated) | ~3-4K |
| Architecture review (after test design validated) | ~3-4K |
| PRD review (after architecture validated) | ~2-3K |
| **Full ceiling** | **~16-23K** |

The initial Codex budget is ~4-6K (code review only). The full ceiling applies only after all checkpoints are activated and validated.

---

## What NOT to Do (Token Antipatterns)

| Antipattern | Token cost | Fix |
|-------------|-----------|-----|
| One long session for whole feature | 200K–400K | Phase-gate into 7 short sessions |
| Architect reads all of `src/` | +50K per read | Architect reads only `CLAUDE.md` + feature `prd.md` |
| Developer reads every existing file before coding | +30K | Developer reads architecture doc + test files only |
| Code Reviewer opens all files in changed modules | +40K | Reviewer reads `git diff` only |
| Using Opus for mechanical tasks (formatting, changelog) | 5× cost | Use Haiku for deterministic/template tasks |
| Auto-compaction without PreCompact hook | Loses context silently | Add PreCompact hook (see hooks/) |
| Asking agent to "understand the whole codebase" | Context bomb | Only ever ask agents to read what they need for the current task |

---

## Recommended External Resources

### Use directly with your workflow
| Resource | What it adds | Link |
|----------|-------------|------|
| **Ruflo/Claude Flow** | Context management hooks (PreCompact/SessionStart) that prevent context loss across compaction; worth using for the hooks alone | github.com/ruvnet/ruflo |
| **shanraisshan/claude-code-best-practice** | Battle-tested patterns: slash commands, skill folders, hook patterns | github.com/shanraisshan/claude-code-best-practice |
| **Anthropic: Building Effective Agents** | First-principles explanation of why these patterns work | anthropic.com/research/building-effective-agents |

### Adopt the patterns, not the full framework
| Resource | Pattern to steal | What to skip |
|----------|-----------------|-------------|
| Ruflo | PreCompact + SessionStart hooks for context archiving | The 313 MCP tools, swarm complexity |
| SPARC methodology | Specification → Pseudocode → Architecture → Refinement → Completion — maps almost exactly to our Phase 1–5 | The cli tooling (use native Claude Code instead) |
| PubNub subagent pipeline | pm-spec → architect-review → implementer-tester chain with explicit handoffs | The PubNub-specific MCP servers |

### Hooks worth adding (from Ruflo)
```json
// .claude/settings.json
{
  "hooks": {
    "PreCompact": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node .claude/helpers/archive-context.js"
      }]
    }],
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node .claude/helpers/restore-context.js"
      }]
    }]
  }
}
```
These archive your conversation turns to SQLite before compaction and restore the
most important context at session start. Install via: `npx ruflo@latest init` then
keep only the hooks config, not the full framework.
