---
description: Design-time security audit (Phase 4)
user-invocable: true
---
Use the security-reviewer subagent.

First, load your skills:
- Read .claude/skills/security-audit/SKILL.md for OWASP checklist, serverless threats, threat model, and audit template
- Read .claude/skills/structured-logging/SKILL.md for security event logging requirements and PII scrubbing rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 4 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-opus-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.js --command security-gate --phase 4 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

Your task: design-time security audit for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + docs/features/$ARGUMENTS/architecture.md
- Do NOT read src/ — audit the design, not the code
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
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
  produced_by: "security-reviewer", timestamp: current ISO 8601
Then print: "Phase 4 complete — NO BLOCKING findings. Next: /implement $ARGUMENTS"

If there ARE BLOCKING findings, do NOT write a new handoff.json — the existing
handoff from the test-design phase remains valid. The pipeline must stop here
until all BLOCKING findings are resolved and /security-gate is re-run.
Then print: "Phase 4 BLOCKED — resolve BLOCKING findings before implementing. Re-run /security-gate $ARGUMENTS after fixes."
