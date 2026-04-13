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

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.js --command architect --phase 2 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

Your task: produce docs/features/$ARGUMENTS/architecture.md

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + the Architecture Notes section of CLAUDE.md
  (If the repo has a docs/CLAUDE.md, read that file for project-specific architecture context instead of the root template)
- If you need to understand an existing pattern, read ONE representative file — not a whole module
- Never Glob src/
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
- Follow the architecture.md Template from the architecture-decision skill
- Include the architecture skill's reliability fields: decision confidence, revisit trigger, rollback/fallback, and trust boundaries when relevant
- If a key architectural assumption is still ambiguous, record it explicitly instead of smoothing it over
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
