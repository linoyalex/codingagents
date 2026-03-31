---
description: Design-time security audit (Phase 4)
user-invocable: true
---
Use the security-reviewer subagent.

First, load your skills:
- Read .claude/skills/security-audit/SKILL.md for OWASP checklist, serverless threats, threat model, and audit template
- Read .claude/skills/structured-logging/SKILL.md for security event logging requirements and PII scrubbing rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 4 verification

Your task: design-time security audit for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/prd.md + docs/architecture/ARCH-$ARGUMENTS.md
- Do NOT read src/ — audit the design, not the code
- Follow the Security Audit Document Template from the security-audit skill
- Classify every finding using the severity levels from the skill: BLOCKING / HIGH / MEDIUM / LOW / INFO
- If any BLOCKING findings exist, the pipeline must stop here — do not proceed to implement

Run: npm audit --audit-level=high
Include output in your report.

Write findings to: docs/security/security-audit-$ARGUMENTS.md
Run Phase 4 verification from verification-gate skill.
Commit with message: "security: design-time audit $ARGUMENTS"

After committing, print one of:
- "Phase 4 complete — NO BLOCKING findings. Next: /implement $ARGUMENTS"
- "Phase 4 BLOCKED — resolve BLOCKING findings before implementing"
