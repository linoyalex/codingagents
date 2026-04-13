# Phase 1: Specify — Verification

After the PRD is written, verify completeness and acceptance criteria coverage.

## Verification Commands

```bash
wc -l docs/features/<feature>/prd.md
grep -c "Given\|When\|Then" docs/features/<feature>/prd.md
grep -n "Dependencies" docs/features/<feature>/prd.md || true
```

## Checklist

- PRD exists at `docs/features/<feature>/prd.md`
- User stories follow Given/When/Then format
- Acceptance criteria are numbered and testable
- Dependencies section identifies upstream/downstream impacts
