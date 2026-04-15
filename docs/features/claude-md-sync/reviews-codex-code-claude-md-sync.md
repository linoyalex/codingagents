# Review: claude-md-sync
**Generated:** 2026-04-15T15:30:35Z

## Findings
- [MAJOR] [tests/integration/claude-md-sync.integration.test.js:169] The integration test named `sync aborts with error when docs/CLAUDE.md is missing` does not actually remove the source `docs/CLAUDE.md` that `init.sh` reads. It invokes the real repo `init.sh`, so `$SCRIPT_DIR/docs/CLAUDE.md` still exists and the script can succeed. The test then forces `assert.fail(...)`, catches its own assertion error, and treats `err.status === undefined` as a passing non-zero exit check. That makes the test vacuous and creates false confidence around a real failure path.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Resolutions (2026-04-15)
- **[MAJOR] Vacuous integration test:** Fixed. Same SCRIPT_DIR issue as the prior E2E fix — created an isolated source directory without `docs/CLAUDE.md` so the error path is genuinely exercised. Also tightened the assertion to require `typeof err.status === 'number'` to prevent `assert.fail` exceptions (which have `status: undefined`) from masquerading as process failures.

## Verification Notes
- Reviewed `git diff main...HEAD`.
- Rechecked the current `init.sh` and `lib/sync-claude-md.sh` implementation paths. The previously identified runtime defects around the interactive exit path, write-before-validate ordering, and legacy template-line stripping appear fixed in the current diff.
- Verified the remaining issue directly from the changed integration test: it runs the repo `init.sh` instead of an isolated source tree without `docs/CLAUDE.md`, and its catch block accepts the thrown `assert.fail` as if it were the script failure being tested.
