# Test Design Review: claude-md-sync
**Generated:** 2026-04-15T02:00:58Z

## Findings
- [HIGH] [AC1 / AC9 / tests/e2e/claude-md-sync.spec.js:484-491] The missing-source E2E test does not actually control the source it claims to remove. It only omits `docs/CLAUDE.md` from the temp project, but `init.sh` is invoked from the repo and resolves its source content via the script directory, so the test name and assertion do not match the condition being exercised. This creates false confidence at best and a guaranteed false failure at worst.
- [MEDIUM] [AC2 / tests/e2e/claude-md-sync.spec.js:139-170] The PTY helper assumes BSD/macOS `script` syntax (`script -q <output-file> bash ...`), which is not portable to common Linux `script` implementations that require `-c` for a command. That makes the interactive-path coverage environment-sensitive and weakens determinism for the most complex AC2 scenarios.

## Coverage Map Notes
- Appears well covered: AC1 marker insertion on init; AC2 interactive overwrite/exit/invalid/EOF logic plus AC2b/AC2c non-sync init paths; AC3 managed-content replacement; AC3b upgrade reminder; AC3c legacy migration and inline preserved-line advisory; AC4 preservation of outside-marker content; AC5 per-section action output and skipped reporting; AC6 no-op detection; AC7 final status coverage for normal and partial-success paths; AC7b backup creation on change, no backup on no-op, and abort-before-modification with user-visible error on backup failure.
- Appears uncovered or weakly covered: AC1/AC9 missing-source failure is not validly exercised by the current E2E test; AC2 interactive coverage remains behaviorally strong but potentially non-portable because the PTY harness assumes one `script` implementation shape; AC8 is exercised indirectly by the broader install-script suite rather than by these feature-specific files, which is consistent with the PRD.

## Recommendations
- Replace the current missing-source E2E with a test that actually removes or redirects the script’s source `docs/CLAUDE.md` dependency for the duration of the run.
- Make the PTY harness explicitly portable or platform-gated so the AC2 interactive tests remain reliable across environments.

## Resolutions (2026-04-15)
- **[HIGH] Missing-source E2E:** Fixed. Test now creates a source directory (with init.sh, lib/, ROLE_*.md, etc.) that omits `docs/CLAUDE.md`, so `SCRIPT_DIR` resolves to the controlled directory. Test passes and correctly exercises the error path.
- **[MEDIUM] PTY portability:** Fixed. Replaced `script(1)` with `expect` for PTY I/O. `expect` provides reliable cross-platform pseudo-terminal control. All 4 PTY tests (overwrite, exit, invalid, EOF) now pass.
