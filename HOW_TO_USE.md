# Multi-Agent Role System — How to Use

This folder contains role definition files for a multi-agent software development workflow.
Each role file defines a specialised AI agent persona with clear responsibilities, standards,
and output checklists.

---

## Quick Start

### Option A: Claude Code (Recommended)

1. Copy the role files you need into your project at `.claude/agents/`.
2. Each file's YAML frontmatter (the `---` block at the top) tells Claude Code what the
   agent is called, when to invoke it, which tools it can use, and which model to run.
3. Trigger an agent explicitly in Claude Code:
   ```
   Use the security-reviewer agent to check this PR for vulnerabilities.
   Use the qa agent to write E2E tests for the closet upload feature.
   ```
4. Or let Claude Code invoke agents automatically based on the `description` field — this
   acts as a trigger that Claude Code matches against your request.

**File location:**
```
your-project/
└── .claude/
    └── agents/
        ├── ROLE_DEVELOPER.md
        ├── ROLE_ARCHITECT.md
        ├── ROLE_QA.md
        ├── ROLE_CODE_REVIEWER.md
        ├── ROLE_SECURITY.md
        ├── ROLE_PRODUCT_OWNER.md
        ├── ROLE_UX_DESIGNER.md
        └── ROLE_DOCUMENTATION_SPECIALIST.md
```

---

### Option B: System Prompt for Other Agentic LLMs

Paste the full contents of a role file as the **system prompt** when spinning up an agent.
The frontmatter YAML is safe to include — models will read it as context.

---

### Option C: Claude.ai Chat (Manual)

Start a conversation with:
```
You are acting as the [Role Name]. Here are your full instructions:

[paste role file contents]

Now, [your task here].
```

---

## Role Reference

| File | When to use | Model tier |
|------|-------------|------------|
| `ROLE_DEVELOPER.md` | Writing features, fixing bugs, writing unit tests | Sonnet |
| `ROLE_ARCHITECT.md` | System design, tech stack decisions, ADRs | Opus |
| `ROLE_QA.md` | E2E tests, acceptance verification, edge case analysis | Sonnet |
| `ROLE_CODE_REVIEWER.md` | PR reviews — **always in a fresh context** | Sonnet |
| `ROLE_SECURITY.md` | Security audits, auth design, vulnerability scanning | Opus |
| `ROLE_PRODUCT_OWNER.md` | User stories, acceptance criteria, backlog prioritisation | Sonnet |
| `ROLE_UX_DESIGNER.md` | User flows, screen specs, accessibility reviews | Sonnet |
| `ROLE_DOCUMENTATION_SPECIALIST.md` | README, CLAUDE.md, API docs, runbooks | Sonnet |

> **Opus** is recommended for Architect and Security because these roles make high-stakes,
> hard-to-reverse decisions. Sonnet is sufficient for all other roles.

---

## Key Patterns

### 1. Writer / Reviewer Separation (Most Important)
Never use the same agent context to both write and review code. A model anchored to its
own implementation will rationalise its choices.

```
Session 1 (Developer): Implement the feature → commit
Session 2 (Code Reviewer): Fresh context, reviews the diff
```

In Claude Code, use `--dangerously-skip-permissions` with separate worktrees for true
parallel isolation, or use subagents with `context: fork`.

### 2. Architect First, Developer Second
For any feature touching multiple systems:
```
Session 1 (Architect): Design and document the approach → ADR committed
Session 2 (Developer): Implement following the ADR
```

### 3. QA Shift Left
Don't wait for code to be written before involving QA.
```
Session 1 (Product Owner): Write user stories + ACs
Session 2 (QA): Review ACs for testability, identify edge cases
Session 3 (Developer): Implement with edge cases already known
Session 4 (QA): Verify implementation against ACs
```

### 4. Documentation as You Go
Run the Documentation Specialist after each sprint, not at the end of the project.
```
After each feature merge:
  → Documentation Specialist updates CLAUDE.md if conventions changed
  → Documentation Specialist updates CHANGELOG.md
  → Documentation Specialist updates API docs if new endpoints added
```

---

## Customising Roles

Every role file has an **Extension Points** section at the bottom. Fill this in with
your project-specific details:
- Framework and runtime versions
- Preferred libraries
- File structure conventions
- Forbidden patterns
- Tooling commands (test runner, linter, build)

The more specific your extension points, the less correction you'll need to do on
agent outputs.

---

## CLAUDE.md Integration

The most important file in your project for agentic workflows is `CLAUDE.md` at the project
root. All roles reference it. Keep it updated using the Documentation Specialist role.

Minimum CLAUDE.md for this role system to work well:

```markdown
# Project: [Name]

## What this is
[2-sentence description]

## Stack
- Runtime: Node 22 / Python 3.12 / etc.
- Framework: Next.js 15 / FastAPI / etc.
- Database: PostgreSQL via Prisma / etc.
- Deployment: Vercel / AWS / etc.

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- E2E: `pnpm test:e2e`
- Lint: `pnpm lint`
- Build: `pnpm build`

## Conventions
- [List your key patterns here]

## Constraints (agents must follow)
- [List what agents must NOT do]

## Gotchas
- [List things that have tripped developers up before]
```
