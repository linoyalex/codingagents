# Phase 2: Architect — Verification

After the architecture document is written, verify decision structure and rollback planning.

## Verification Commands

```bash
ls docs/features/<feature>/architecture.md
grep -qi "Decision Confidence" docs/features/<feature>/architecture.md
grep -qi "Revisit When" docs/features/<feature>/architecture.md
grep -qi "Rollback / Fallback" docs/features/<feature>/architecture.md
```

## Checklist

- Architecture doc exists with ADR-style decision record
- Decision Confidence level is stated
- Revisit When conditions are defined
- Rollback / Fallback plan is documented
- Module boundaries and ownership are clear
