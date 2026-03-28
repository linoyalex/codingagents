Use the documentation-specialist subagent.

Your task: post-merge documentation update for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/prd.md + CHANGELOG.md + CLAUDE.md
- Do NOT read src/ — the prd.md describes what changed at the right level
- Update CHANGELOG.md with a new entry under the current (unreleased) version:
    Format: ## [Unreleased]
    Added / Changed / Fixed / Security — one bullet per AC from docs/prd.md
- If any new conventions were established during this feature cycle
  (check PR description and docs/review-$ARGUMENTS.md for notes):
    → Update the Conventions section of CLAUDE.md
    → Update the Known Gotchas section if anything new was discovered
- Update the "Last updated" timestamp in CLAUDE.md
- Commit with message: "docs: post-merge update for $ARGUMENTS"

After committing, print:
"Phase 7 complete — pipeline cycle finished for $ARGUMENTS"