### After Phase 5 (Implement)

Verify all tests pass and code quality checks are clean.

```bash
# Run feature-scoped tests first. Adapt to your stack:
#   node --test tests/node/<feature>*.test.js
#   npm test -- tests/contracts/<feature>.test.ts tests/e2e/<feature>.spec.ts
npm run lint && npm run build
grep -rn "console\.log\|debugger" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec" | head -10
grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v "TODO.*type" | head -10
```

#### Checklist

- All feature-scoped tests pass (GREEN state)
- TDD commits present: RED, GREEN, REFACTOR
- Lint and build pass with zero errors
- No leftover `console.log` or `debugger` statements
- No untyped `any` without `// TODO: type this`
