---
description: Post-merge documentation update for a feature (Phase 7)
user-invocable: true
---
Use the documentation-specialist subagent.

First, load your skills:
- Read .claude/skills/release-docs/SKILL.md for changelog format, release notes template, and CLAUDE.md update procedure
- Read .claude/skills/verification-gate/SKILL.md for Phase 7 verification

Your task: post-merge documentation update for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/prd.md + CHANGELOG.md + CLAUDE.md + the most recent file in release-notes/
- Do NOT read src/ — the prd.md describes what changed at the right level
- Follow the CHANGELOG.md Format from the release-docs skill
- Update CHANGELOG.md: one bullet per AC from docs/prd.md
- Create a release note in release-notes/ following the Release Notes Template from the skill:
    Run the Data Gathering Commands from the skill for commit count and test count
    Also read docs/reviews/review-$ARGUMENTS.md if it exists for review findings
- If any new conventions were established during this feature cycle
  (check PR description and docs/reviews/review-$ARGUMENTS.md for notes):
    → Update the Conventions section of CLAUDE.md
    → Update the Known Gotchas section if anything new was discovered
- Update the "Last updated" timestamp in CLAUDE.md
- Run Phase 7 verification from verification-gate skill
- Commit with message: "docs: post-merge update for $ARGUMENTS"

After committing, print:
"Phase 7 complete — pipeline cycle finished for $ARGUMENTS"
