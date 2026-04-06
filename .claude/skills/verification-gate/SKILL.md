---
name: verification-gate
description: Cross-cutting verification commands and Definition of Done checklists used by all agents
version: "1.0.0"
---

# Skill: Verification Gate

## Standard Verification Commands

Run these in sequence before declaring any task complete. Do not declare done if any fail.

```bash
# 1. Tests must pass (adapt command to your project)
npm test                    # or: pnpm test / pytest -v / cargo test

# 2. Type checking must pass (if applicable)
npx tsc --noEmit            # or: pnpm typecheck / mypy .

# 3. Linter must pass with no errors
npm run lint                # or: pnpm lint / ruff check . / eslint .

# 4. Build must succeed
npm run build               # or: pnpm build / cargo build
```

## Phase-Specific Verification

### After Phase 1 (Specify)
```bash
# Verify PRD exists and is under 150 lines
wc -l docs/features/<feature>/prd.md
# Verify all ACs use Given/When/Then format
grep -c "Given\|When\|Then" docs/features/<feature>/prd.md
```

### After Phase 2 (Architect)
```bash
# Verify architecture doc exists
ls docs/features/<feature>/architecture.md
# Verify no circular dependencies (if madge is available)
npx madge --circular src/ 2>/dev/null || echo "Install madge for circular dep checking"
```

### After Phase 3 (Test Design)
```bash
# Verify tests exist and FAIL (RED state)
npm test 2>&1 | tail -10
# Expected: tests should fail — they're shells waiting for implementation
# Verify no .skip or xtest
grep -rn "\.skip\|xtest\|xit\b" tests/ src/**/__tests__/ 2>/dev/null && echo "SKIPPED TESTS FOUND" || echo "No skips"
```

### After Phase 4 (Security Gate)

> Replace `<feature>` below with the current feature slug (e.g. `user-auth`).

```bash
# Verify security audit doc exists for THIS feature
ls docs/features/<feature>/security-audit.md
# Verify no BLOCKING severity findings for THIS feature
# Matches both heading format (#### BLOCKING:) and list format (- BLOCKING:)
if grep -qiE "(^#{1,6}\s+\[?BLOCKING\]?\s*:)|(^\s*-\s+\[?BLOCKING\]?\s*:)" docs/features/<feature>/security-audit.md; then
  echo "BLOCKING findings present — pipeline must stop"
  exit 1
fi
# Run dependency audit
npm audit --audit-level=high
```

### After Phase 5 (Implement)
```bash
# Full verification suite
npm test && npm run lint && npm run build
# Verify no debug artifacts
grep -rn "console\.log\|debugger" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec" | head -10
# Verify no type bypasses
grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v "TODO.*type" | head -10
```

### After Phase 6 (Review)

> Replace `<feature>` below with the current feature slug (e.g. `user-auth`).

```bash
# Verify review doc exists for THIS feature
ls docs/features/<feature>/review.md
# Verify review verdict is not REQUEST_CHANGES for THIS feature
if grep -qi "REQUEST.CHANGES" docs/features/<feature>/review.md; then
  echo "Review verdict is REQUEST_CHANGES — address findings before proceeding"
  exit 1
fi
```

### After Phase 7 (Document)
```bash
# Verify CHANGELOG updated
head -20 CHANGELOG.md
# Verify CLAUDE.md timestamp updated
grep -i "last updated" CLAUDE.md
# Verify release note exists
ls release-notes/ | tail -1
```

## Handoff Validation (applies to all phases)

After completing any phase, verify the handoff artifact:

```bash
# Verify handoff.json exists
test -f .claude/handoff.json && echo "✓ handoff.json exists" || echo "⚠ handoff.json missing"

# Full schema validation (matches the Stop hook's enforcement)
node -e "
  const h = require('./.claude/handoff.json');
  const errors = [];

  // Required fields
  const req = ['feature','phase','goal','scope','relevant_files','acceptance_criteria','verification_commands'];
  const missing = req.filter(f => !(f in h));
  if (missing.length) errors.push('Missing fields: ' + missing.join(', '));

  // Type checks
  if (typeof h.feature !== 'string' || !h.feature.length) errors.push('feature must be a non-empty string');
  if (typeof h.phase !== 'number' || !Number.isInteger(h.phase) || h.phase < 1 || h.phase > 7) errors.push('phase must be integer 1-7');
  if (typeof h.goal !== 'string' || !h.goal.length) errors.push('goal must be a non-empty string');
  if (typeof h.scope !== 'string' || !h.scope.length) errors.push('scope must be a non-empty string');
  if (!Array.isArray(h.relevant_files)) errors.push('relevant_files must be an array');
  if (!Array.isArray(h.acceptance_criteria)) errors.push('acceptance_criteria must be an array');
  if (!Array.isArray(h.verification_commands)) errors.push('verification_commands must be an array');
  if (h.constraints !== undefined && !Array.isArray(h.constraints)) errors.push('constraints must be an array');
  if (h.known_risks !== undefined && !Array.isArray(h.known_risks)) errors.push('known_risks must be an array');

  // No unexpected properties
  const allowed = ['feature','phase','goal','scope','constraints','relevant_files','acceptance_criteria','verification_commands','known_risks','produced_by','timestamp'];
  const unexpected = Object.keys(h).filter(k => !allowed.includes(k));
  if (unexpected.length) errors.push('Unexpected properties: ' + unexpected.join(', '));

  if (errors.length) { console.log('⚠ Validation failed:'); errors.forEach(e => console.log('  -', e)); process.exit(1); }
  else { console.log('✓ Schema validation passed | Feature:', h.feature, '| Phase:', h.phase); }
"
```

This is a **blocking** gate — do not proceed to the next phase without a valid `.claude/handoff.json`.

## Universal Checklist (applies to all phases)

- [ ] `.claude/handoff.json` exists and passes schema validation
- [ ] No secrets, API keys, or credentials in any committed file
- [ ] No hardcoded environment-specific values
- [ ] Commit messages follow format: `type(scope): description`
- [ ] Changes are atomic — one logical change per commit
- [ ] No TODO comments without linked ticket/issue numbers

## No-Go Criteria (stop the pipeline if any are true)

- ❌ `.claude/handoff.json` missing or invalid
- ❌ Tests fail or have been skipped to pass
- ❌ BLOCKING security finding unresolved
- ❌ Build fails
- ❌ Linter errors present
- ❌ Secrets detected in committed code

## Retrospective Protocol (self-improving feedback loop)

After completing any pipeline phase, append a structured retrospective entry. Before starting a phase, read the last 3 retrospectives for that phase to avoid repeating mistakes.

### Write a Retrospective (end of phase)

```bash
# Create retrospectives directory if it doesn't exist
mkdir -p .claude/retrospectives
```

Write to: `.claude/retrospectives/YYYY-MM-DD-{feature}-phase{N}.md`

```markdown
## Retrospective: [Feature] — Phase [N] ([Phase Name])
**Date:** YYYY-MM-DD | **Duration:** [approx tokens used or time]

### What Worked
- [Technique or approach that produced good results]

### What Failed
- [What went wrong, root cause, and how it was fixed]

### Pattern Discovered
- [Any reusable insight — e.g., "edge function cold starts cause timeout in integration tests; add retry wrapper"]

### Skill Gap
- [Anything the skill file should have told you but didn't — this drives skill improvement]
```

Rules:
- Keep each retrospective under 20 lines — brevity forces clarity
- Only record novel findings, not routine successes
- "What Failed" must include root cause, not just symptoms
- "Skill Gap" entries are the input for skill file improvements — review these quarterly

### Read Retrospectives (start of phase)

```bash
# Read the last 3 retrospectives for the current phase
ls -t .claude/retrospectives/*-phase{N}.md 2>/dev/null | head -3 | xargs cat 2>/dev/null
# If no retrospectives exist, proceed normally
```

Apply any relevant patterns or avoid any documented pitfalls before starting work.
