---
description: source_spec-anchored code review in fresh context (Phase 6)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| code-review | skills/code-review/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the code-reviewer subagent.

Session requirement: This phase must run in a fresh session — not the session
that wrote the code.

Model: This phase should run with claude-sonnet-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.js --command review --phase 6 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

First, load your skills:
- Read .claude/skills/code-review/SKILL.md for review methodology, Reviewer Independence, and finding classification
- Read .claude/skills/verification-gate/SKILL.md for Phase 6 verification

## Source Spec Verification

First read the `source_spec` field from `.claude/handoff.json`. This is the originating spec (PRD, ticket, or issue URL) that anchors the review.

- If `source_spec` is missing from the handoff: **Review halted — source_spec missing. Cannot proceed without a resolvable pointer to the originating spec.**
- If `source_spec` points to a file that does not exist or is unresolvable: **Review halted — source_spec unresolvable. The file does not exist.**
- Read the source_spec document and form your own expectations independently before reading any diff or developer summary.

## Separate Context Check

Check the `produced_by` field in the incoming handoff. If `produced_by` matches the current reviewer role (code-reviewer), halt: "Review requires separate context: current role matches handoff.produced_by." The same role must not author and review.

Even if the role check passes, independently re-derive your coverage expectations from the source_spec. Do not trust framing carried over from the authoring phase.

Your task: review the current branch against main.

Rules:
- Follow the Review Methodology from the code-review skill (understand intent → big picture → tests → impl → integration)
- Run: git diff main...HEAD (read the diff, not individual files)
- If a finding requires context, open that ONE file — not its whole module
- Run the Quick Automated Checks from the code-review skill
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading in all review artifacts, including named review-claude-*.md files. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
- Include in the review artifact header: "Reviewed in separate context from authoring phase" and the reviewer identity.
- Write findings to docs/features/$ARGUMENTS/review.md using the Review Document Template from the skill
- Run Phase 6 verification from verification-gate skill

Commit docs/features/$ARGUMENTS/review.md with message: "review: $ARGUMENTS findings"

If the verdict is APPROVE, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 6, goal: "Post-merge documentation update",
  scope: "Phase 7 documentation only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "CHANGELOG.md", "CLAUDE.md"],
  acceptance_criteria: ["CHANGELOG.md updated", "CLAUDE.md timestamp updated"],
  verification_commands: ["head -20 CHANGELOG.md", "grep -i 'last updated' CLAUDE.md"],
  produced_by: "code-reviewer", timestamp: current ISO 8601
Then print: "Phase 6 complete — APPROVED. Next: /document $ARGUMENTS (after merge)"

If the verdict is REQUEST CHANGES, do NOT write a new handoff.json — the
existing handoff from the implementation phase remains valid. The developer
must address the findings and re-run /review in a new session.
Then print: "Phase 6 — REQUEST CHANGES. Developer must address BLOCKING items, then re-run /review $ARGUMENTS"
