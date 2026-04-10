---
description: Post-merge documentation update for a feature (Phase 7)
user-invocable: true
---
Use the documentation-specialist subagent.

First, load your skills:
- Read .claude/skills/release-docs/SKILL.md for changelog format, release notes template, and CLAUDE.md update procedure
- Read .claude/skills/verification-gate/SKILL.md for Phase 7 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-haiku-4-5.

First, read .claude/handoff.json. If it references a different feature or
unexpected phase, warn the user before proceeding.

Your task: post-merge documentation update for feature: $ARGUMENTS

Rules:
- Determine the target CLAUDE file:
    If docs/CLAUDE.md exists → TARGET_CLAUDE=docs/CLAUDE.md (framework-repo conventions)
    Otherwise → TARGET_CLAUDE=CLAUDE.md (project conventions)
- Read ONLY: docs/features/$ARGUMENTS/prd.md + CHANGELOG.md + TARGET_CLAUDE + the most recent file in release-notes/
- Do NOT read src/ — the prd.md describes what changed at the right level
- Follow the CHANGELOG.md Format from the release-docs skill
- Update CHANGELOG.md: one bullet per AC from docs/features/$ARGUMENTS/prd.md
- Create a release note in release-notes/ following the Release Notes Template from the skill:
    Run the Data Gathering Commands from the skill for commit count and test count
    Also read docs/features/$ARGUMENTS/review.md if it exists for Claude review findings
    Also read docs/features/$ARGUMENTS/review-codex-code-$ARGUMENTS.md if it exists for Codex review findings
- If any new conventions were established during this feature cycle
  (check PR description, docs/features/$ARGUMENTS/review.md, and docs/features/$ARGUMENTS/review-codex-code-$ARGUMENTS.md for notes):
    → Update the Conventions section of TARGET_CLAUDE
    → Update the Known Gotchas section of TARGET_CLAUDE if anything new was discovered
- Update the "Last updated" timestamp in TARGET_CLAUDE
- Run Phase 7 verification from verification-gate skill
- Commit with message: "docs: post-merge update for $ARGUMENTS"

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 7, goal: "Pipeline complete. Merge to main after final checks.",
  scope: "No further phases", relevant_files: ["CHANGELOG.md", "CLAUDE.md"],
  acceptance_criteria: ["CHANGELOG.md updated", "Release note created", "CLAUDE.md timestamp updated"],
  verification_commands: ["head -20 CHANGELOG.md", "ls release-notes/ | tail -1"],
  produced_by: "documentation-specialist", timestamp: current ISO 8601

Then print:
"Phase 7 complete — pipeline cycle finished for $ARGUMENTS"
