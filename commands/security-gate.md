---
description: Design-time security audit (Phase 4)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| security-audit | skills/security-audit/SKILL.md |
| structured-logging | skills/structured-logging/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the security-reviewer subagent.

First, load your skills:
- Read .claude/skills/security-audit/SKILL.md for OWASP checklist, serverless threats, threat model, and audit template
- Read .claude/skills/structured-logging/SKILL.md for security event logging requirements and PII scrubbing rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 4 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-opus-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.cjs --command security-gate --phase 4 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

## Source Spec Verification

First read the `source_spec` field from `.claude/handoff.json`. This is the originating spec (PRD, ticket, or issue URL) that anchors the security audit.

- If `source_spec` is missing: halt with an explicit error.
- If `source_spec` is unresolvable: halt with an explicit error.
- Read the source_spec document before reading any other handoff claims.

## Separate Context Check

Check the `produced_by` field in the incoming handoff. If `produced_by` matches the current reviewer role (security-reviewer), halt: "Security gate requires separate context: current role matches handoff.produced_by." The same role must not author and review.

## Symmetric Gate Enforcement

When verifying a gate-phase check (e.g., `produced_by`, `source_spec`, `separate context`), confirm the identical check exists in both `commands/review.md` and `commands/security-gate.md`. If one gate has a check the other lacks, raise a HIGH finding.

## Existing Review Context

If this is a re-review, read any existing security review artifacts already present in
`docs/features/$ARGUMENTS/` before auditing, especially:
- `security-audit.md`

Inspect any `## Resolution Notes` or `## Resolutions` section first. Treat response
notes as claims to verify against the current design, not as proof that a concern is fixed.

Your task: design-time security audit for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + docs/features/$ARGUMENTS/architecture.md
- Do NOT read src/ — audit the design, not the code
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
- Include in the audit artifact header: "Reviewed in separate context from authoring phase" and the reviewer identity.
- Follow the Security Audit Document Template from the security-audit skill
- Classify every finding using the severity levels from the skill: BLOCKING / HIGH / MEDIUM / LOW / INFO
- If any BLOCKING findings exist, the pipeline must stop here — do not proceed to implement

Run: npm audit --audit-level=high
Include output in your report.

Write findings to: docs/features/$ARGUMENTS/security-audit.md
Run Phase 4 verification from verification-gate skill.
Commit with message: "security: design-time audit $ARGUMENTS"

If there are NO BLOCKING findings, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 4, goal: "Implement feature using strict TDD",
  scope: "Phase 5 implementation only", relevant_files: ["docs/features/$ARGUMENTS/architecture.md", "tests/contracts/$ARGUMENTS.test.ts", "tests/e2e/$ARGUMENTS.spec.ts"],
  acceptance_criteria: [from the PRD], verification_commands: ["npm test"],
  source_spec: "docs/features/$ARGUMENTS/prd.md",
  produced_by: "security-reviewer", timestamp: current ISO 8601
Then print: "Phase 4 complete — NO BLOCKING findings. Next: /implement $ARGUMENTS"

If there ARE BLOCKING findings, do NOT write a new handoff.json — the existing
handoff from the test-design phase remains valid. The pipeline must stop here
until all BLOCKING findings are resolved and /security-gate is re-run.
Then print: "Phase 4 BLOCKED — resolve BLOCKING findings before implementing. Re-run /security-gate $ARGUMENTS after fixes."
