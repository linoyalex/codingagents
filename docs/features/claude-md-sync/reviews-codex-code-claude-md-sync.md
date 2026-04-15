# Review: claude-md-sync
**Generated:** 2026-04-15T13:54:45Z

## Findings
- [BLOCKING] [init.sh:163] The interactive `init.sh` "exit" path does not actually exit. After prompting, the default/`e` branch only prints the re-run message and sets `CLAUDE_MD_STATUS`, then the script continues through `.gitignore` updates, version-file writes, and the final success summary. I verified this under a real PTY: choosing `e` still created `.claude/agents/` and `.claude/.codingagents-version`. That contradicts the documented `exit 0` behavior and turns a defensive prompt into a partially-applied install.
- [BLOCKING] [init.sh:146] `init.sh --sync-claude-md` overwrites the target `CLAUDE.md` before it verifies that `docs/CLAUDE.md` exists or that sync can succeed. The code backs up the original, copies the root template into place, and only then checks `"$SCRIPT_DIR/docs/CLAUDE.md"`. I reproduced this by running `init.sh --sync-claude-md` from a source tree missing `docs/CLAUDE.md`: the script exited non-zero, but the target `CLAUDE.md` had already been replaced by the template. That violates the write-safety contract that failures abort before modifying the original file.
- [MAJOR] [lib/sync-claude-md.sh:134] Legacy migration does not implement the required "current template text" stripping step. `_sync_migrate_section` removes placeholder scaffolding and blank lines only; it never reads the current root `CLAUDE.md` section and subtracts lines byte-identical to that template content. I verified this against the unchanged root [CLAUDE.md](/Users/linoy/projects/codingagents-008/CLAUDE.md:175): migrating a legacy `## Known Gotchas` section containing those current template bullets preserves them below the new managed block as supposed "user" content, leaving stale duplicate framework instructions after first sync.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Resolutions (2026-04-15)
- **[BLOCKING] Exit path:** Fixed. Non-overwrite choice now exits immediately at early capture (before any file operations), preventing partial installs. Dead code in step [6/7] removed.
- **[BLOCKING] Write-before-validate:** Fixed. `docs/CLAUDE.md` existence check now runs before template copy or backup creation.
- **[MAJOR] Template-content stripping:** Fixed. `_sync_migrate_section` now accepts an optional template file path, extracts its section content, and strips lines byte-identical to the template before computing preserved user content. `upgrade.sh` passes `$SCRIPT_DIR/CLAUDE.md` as the template. 2 new contract tests verify the behavior.

## Verification Notes
- Reviewed `git diff main...HEAD`.
- Read `.claude/handoff.json` for AC IDs and known risks.
- Opened unchanged [CLAUDE.md](/Users/linoy/projects/codingagents-008/CLAUDE.md:130) to verify the current-template stripping requirement against real section content.
- Reproduced the interactive `init` exit path under a PTY and confirmed the install still completed.
- Reproduced the missing-source `init --sync-claude-md` failure in a temp source tree and confirmed the original `CLAUDE.md` was replaced before the error.
- Reproduced legacy migration against a temp `CLAUDE.md` containing current-template `Known Gotchas` lines and confirmed those lines were preserved as stale post-marker content.
