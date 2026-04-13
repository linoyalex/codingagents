---
name: verification-gate
description: Cross-cutting verification commands and Definition of Done checklists used by all agents
version: "2.0.0"
---

# Skill: Verification Gate

## Top Rules

- Verify the active feature first; use the smallest reliable command before broad project-wide checks.
- If the feature slug, artifact, or handoff state is ambiguous, stale, or malformed, stop and repair that state before proceeding.
- Prefer deterministic checks over approximate signals.
- Do not declare a phase complete if the required artifact, verdict, or handoff is missing.

## Standard Verification

Use the smallest reliable command that fits your stack. Broader checks are for final sweeps, not first-pass diagnosis.

```bash
# Examples only — adapt to your stack
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Phase-Specific Verification

Each phase has its own reference file with verification commands:

- [See reference: skills/verification-gate/phase-1-specify.md]
- [See reference: skills/verification-gate/phase-2-architect.md]
- [See reference: skills/verification-gate/phase-3-test-design.md]
- [See reference: skills/verification-gate/phase-4-security-gate.md]
- [See reference: skills/verification-gate/phase-5-implement.md]
- [See reference: skills/verification-gate/phase-6-review.md]
- [See reference: skills/verification-gate/phase-7-document.md]

## Handoff Validation

```bash
test -f .claude/handoff.json && echo "✓ handoff.json exists" || echo "⚠ handoff.json missing"
node -e "
  const h = require('./.claude/handoff.json');
  const req = ['feature','phase','goal','scope','relevant_files','acceptance_criteria','verification_commands'];
  const errors = req.filter(f => !(f in h)).map(f => 'Missing field: ' + f);
  if (typeof h.feature !== 'string' || !h.feature.length) errors.push('feature must be a non-empty string');
  if (typeof h.phase !== 'number' || !Number.isInteger(h.phase) || h.phase < 1 || h.phase > 7) errors.push('phase must be integer 1-7');
  if (!Array.isArray(h.relevant_files)) errors.push('relevant_files must be an array');
  if (!Array.isArray(h.acceptance_criteria)) errors.push('acceptance_criteria must be an array');
  if (!Array.isArray(h.verification_commands)) errors.push('verification_commands must be an array');
  if (errors.length) { errors.forEach(e => console.log('⚠', e)); process.exit(1); }
  console.log('✓ Schema validation passed | Feature:', h.feature, '| Phase:', h.phase);
"
```

This is a blocking gate. If the handoff is stale, malformed, or mismatched with the active feature, stop and repair it before continuing.

## No-Go Criteria

- `.claude/handoff.json` is missing or invalid
- Active feature is ambiguous or mismatched with the artifact being verified
- Required verification is skipped or relies only on a broad ambiguous command
- Tests fail, are skipped, or fail for the wrong reason
- BLOCKING security findings remain unresolved
- Build or lint fails

---
**STOP CONDITIONS (end of file):**
- Do not declare a phase complete if the required artifact, verdict, or handoff is missing.
- Do not proceed past a BLOCKING security finding.
- Do not skip handoff validation — it is a blocking gate.
- If the feature slug is ambiguous or mismatched, stop and repair before continuing.
