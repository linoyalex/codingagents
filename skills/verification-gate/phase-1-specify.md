### After Phase 1 (Specify)

Verify PRD completeness and acceptance criteria coverage.

```bash
wc -l docs/features/<feature>/prd.md
grep -c "Given\|When\|Then" docs/features/<feature>/prd.md
grep -n "Dependencies" docs/features/<feature>/prd.md || true
```

#### Checklist

- PRD exists at `docs/features/<feature>/prd.md`
- User stories follow Given/When/Then format
- Acceptance criteria are numbered and testable
- Dependencies section identifies upstream/downstream impacts
