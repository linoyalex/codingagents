Use the security-reviewer subagent.

Your task: design-time security audit for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/prd.md + docs/architecture/ARCH-$ARGUMENTS.md
- Do NOT read src/ — audit the design, not the code
- Write findings to: docs/security-audit-$ARGUMENTS.md
- Classify every finding: BLOCKING / HIGH / MEDIUM / LOW / INFO
- If any BLOCKING findings exist, the pipeline must stop here — do not proceed to implement

Run: npm audit --audit-level=high
Include output in your report.

Commit with message: "security: design-time audit $ARGUMENTS"

After committing, print one of:
- "Phase 4 complete — NO BLOCKING findings. Next: /implement $ARGUMENTS"
- "Phase 4 BLOCKED — resolve BLOCKING findings before implementing"