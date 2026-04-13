# Phase 3: Test Design — Verification

After test shells are written, verify RED state and coverage of acceptance criteria.

## Verification Commands

```bash
# Run a feature-scoped RED check. Adapt to your stack:
#   node --test tests/node/<feature>*.test.js 2>&1 | tail -20
#   npm test -- tests/contracts/<feature>.test.ts tests/e2e/<feature>.spec.ts 2>&1 | tail -20
# Expected: fail for the intended reason, not for unrelated setup errors.
grep -rn "\.skip\|xtest\|xit\b" tests/ src/**/__tests__/ 2>/dev/null && echo "SKIPPED TESTS FOUND" || echo "No skips"
```

## Checklist

- All new tests fail for the intended reason (RED state)
- No skipped tests (`.skip`, `xtest`, `xit`)
- Each acceptance criterion has at least one test
- Tests use structural anchors, not phrase-binding
