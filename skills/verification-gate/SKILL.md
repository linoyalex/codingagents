---
name: verification-gate
description: Cross-cutting verification commands and Definition of Done checklists used by all agents
version: "1.2.0"
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

### After Phase 1 (Specify)
```bash
wc -l docs/features/<feature>/prd.md
grep -c "Given\|When\|Then" docs/features/<feature>/prd.md
grep -n "Dependencies" docs/features/<feature>/prd.md || true
```

### After Phase 2 (Architect)
```bash
ls docs/features/<feature>/architecture.md
grep -qi "Decision Confidence" docs/features/<feature>/architecture.md
grep -qi "Revisit When" docs/features/<feature>/architecture.md
grep -qi "Rollback / Fallback" docs/features/<feature>/architecture.md
```

### After Phase 3 (Test Design)
```bash
# Run a feature-scoped RED check first. Adapt to your stack.
# Examples:
#   node --test tests/node/<feature>*.test.js 2>&1 | tail -20
#   npm test -- tests/contracts/<feature>.test.ts tests/e2e/<feature>.spec.ts 2>&1 | tail -20
# Expected: fail for the intended reason, not for unrelated setup errors.
grep -rn "\.skip\|xtest\|xit\b" tests/ src/**/__tests__/ 2>/dev/null && echo "SKIPPED TESTS FOUND" || echo "No skips"
```

### After Phase 4 (Security Gate)
```bash
ls docs/features/<feature>/security-audit.md
if grep -qiE "(^#{1,6}\s+\[?BLOCKING\]?\s*:)|(^\s*-\s+\[?BLOCKING\]?\s*:)" docs/features/<feature>/security-audit.md; then
  echo "BLOCKING findings present — pipeline must stop"
  exit 1
fi
npm audit --audit-level=high
```

### After Phase 5 (Implement)
```bash
# Run feature-scoped tests first. Adapt to your stack.
# Examples:
#   node --test tests/node/<feature>*.test.js
#   npm test -- tests/contracts/<feature>.test.ts tests/e2e/<feature>.spec.ts
npm run lint && npm run build
grep -rn "console\.log\|debugger" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec" | head -10
grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v "TODO.*type" | head -10
```

### After Phase 6 (Review)
```bash
ls docs/features/<feature>/review.md
if grep -qi "REQUEST.CHANGES" docs/features/<feature>/review.md; then
  echo "Review verdict is REQUEST_CHANGES — address findings before proceeding"
  exit 1
fi
```

### After Phase 7 (Document)
```bash
head -20 CHANGELOG.md
grep -i "last updated" CLAUDE.md
ls release-notes/ | tail -1
```

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
