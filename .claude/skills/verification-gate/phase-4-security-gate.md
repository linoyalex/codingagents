# Phase 4: Security Gate — Verification

After the security audit, verify no BLOCKING findings remain and dependencies are clean.

## Verification Commands

```bash
ls docs/features/<feature>/security-audit.md
if grep -qiE "(^#{1,6}\s+\[?BLOCKING\]?\s*:)|(^\s*-\s+\[?BLOCKING\]?\s*:)" docs/features/<feature>/security-audit.md; then
  echo "BLOCKING findings present — pipeline must stop"
  exit 1
fi
npm audit --audit-level=high
```

## Checklist

- Security audit document exists
- No BLOCKING findings remain unresolved
- Dependency audit passes at high severity level
- All new data fields have classification (Public/Internal/Confidential/Restricted)
