---
description: Produce an architecture decision record (Phase 2)
user-invocable: true
---
Use the architect subagent.

First, load your skills:
- Read .claude/skills/architecture-decision/SKILL.md for ADR and ARCH templates
- Read .claude/skills/verification-gate/SKILL.md for Phase 2 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-opus-4-6.

First, read .claude/handoff.json. If it references a different feature or
unexpected phase, warn the user before proceeding.

Your task: produce docs/features/$ARGUMENTS/architecture.md

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + the Architecture Notes section of CLAUDE.md
  (If the repo has a docs/CLAUDE.md, read that file for project-specific architecture context instead of the root template)
- If you need to understand an existing pattern, read ONE representative file — not a whole module
- Never Glob src/
- Follow the architecture.md Template from the architecture-decision skill
- Output must be under 100 lines
- Run Phase 2 verification from verification-gate skill
- Commit when done with message: "arch: $ARGUMENTS architecture decision record"

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 2, goal: "Write failing test shells from specs",
  scope: "Phase 3 test design only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls tests/contracts/$ARGUMENTS.test.ts"],
  produced_by: "architect", timestamp: current ISO 8601

Then print:
"Phase 2 complete. Next: /test-design $ARGUMENTS"
