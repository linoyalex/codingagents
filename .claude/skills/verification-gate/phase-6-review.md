### After Phase 6 (Review)

Verify the review document and verdict before proceeding.

```bash
ls docs/features/<feature>/review.md
if grep -qi "REQUEST.CHANGES" docs/features/<feature>/review.md; then
  echo "Review verdict is REQUEST_CHANGES — address findings before proceeding"
  exit 1
fi
```

#### Checklist

- Review document exists at `docs/features/<feature>/review.md`
- Verdict is APPROVE, REQUEST_CHANGES, or NEEDS_DISCUSSION
- If REQUEST_CHANGES: developer must address findings before proceeding
- Review was conducted in a fresh session (not the same session that wrote the code)
