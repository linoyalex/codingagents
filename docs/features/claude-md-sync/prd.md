## Feature: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T15:30:00Z
**Phase:** Specify | Date: 2026-04-14
**Ticket:** ISS-008

### User Story
As a framework consumer,
I want `init.sh` and `upgrade.sh` to optionally sync my project's root `CLAUDE.md` with the framework's reference `docs/CLAUDE.md`,
So that my project stays current with new conventions, naming rules, folder structure, architecture notes, and known gotchas without losing my project-specific customizations.

### Acceptance Criteria

- [ ] **AC1:** Given `init.sh` is run with `--sync-claude-md`, When the script completes, Then the root `CLAUDE.md` eligible sections are populated with consumer-relevant content from `docs/CLAUDE.md`, filtered by the selection rule (see Dependencies). Each synced block is wrapped in `<!-- managed:start:<section-id> -->` / `<!-- managed:end:<section-id> -->` marker pairs.
- [ ] **AC2:** Given `init.sh` is run without `--sync-claude-md`, When the script completes, Then the root `CLAUDE.md` is copied as today with placeholder comments intact
- [ ] **AC3:** Given an existing project with a customized root `CLAUDE.md` containing managed markers, When `upgrade.sh --sync-claude-md` is run, Then content inside managed marker pairs is replaced with the latest reference content, and all content outside managed markers is preserved unchanged
- [ ] **AC4:** Given a root `CLAUDE.md` with user-added content outside managed markers (e.g. project-specific gotchas, custom conventions added below the managed block), When sync runs, Then that user content is preserved unchanged in its original position
- [ ] **AC5:** Given sync completes (init or upgrade), When the user views the terminal output, Then the output lists each eligible section with its action: `[added]`, `[updated]`, `[unchanged]`, or `[preserved-user]`, plus a summary line with counts (e.g. "3 added, 1 updated, 2 unchanged")
- [ ] **AC6:** Given a root `CLAUDE.md` where a managed section's content is byte-identical to the reference, When sync runs, Then that section is reported as `[unchanged]` and its markers and content are left untouched
- [ ] **AC7:** Given the existing test suite in `test-install-scripts.sh`, When all tests are run after implementation, Then all existing tests continue to pass
- [ ] **AC8:** Given the implementation is complete, When tests are run, Then new test cases cover: init with sync, upgrade with sync, preservation of user content outside markers, no-op when already in sync, and upgrade with missing/malformed markers

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| Terminal (init --sync-claude-md) | N/A — CLI output only | "Syncing CLAUDE.md sections..." progress line | Per-section action list printed to stdout | (1) docs/CLAUDE.md missing or unreadable → error + exit 1; (2) root CLAUDE.md not writable → error + exit 1 | Summary line: "N added, M unchanged" |
| Terminal (upgrade --sync-claude-md) | N/A | "Merging CLAUDE.md sections..." progress line | Per-section action list printed to stdout | (1) docs/CLAUDE.md or root CLAUDE.md missing → error + exit 1; (2) permission denied on write → error + exit 1; (3) managed markers malformed or unpaired → warning per section + skip that section | Summary line: "N updated, M unchanged, P preserved-user" |
| Terminal (no-op sync) | N/A | N/A | N/A | N/A | "CLAUDE.md already in sync — no changes needed" |

### Out of Scope

- Full-file replacement of root `CLAUDE.md` (sync is section-level only)
- Syncing sections specific to framework development (e.g. "What this repo is", "File ownership boundaries", "Cross-Agent Session Context", "Working model", "When modifying the template CLAUDE.md")
- Automatic sync without the `--sync-claude-md` flag (must be opt-in)
- Backup/restore of `CLAUDE.md` before sync (tracked separately in ISS-007)
- Interactive merge conflict resolution — user edits inside managed markers are overwritten on next sync; user content must go outside markers
- Handling renamed or reordered headings in the target — sync matches by marker ID, not heading text

### Dependencies

- `docs/CLAUDE.md` must exist and contain the reference sections with recognizable markdown headings
- **Managed markers are mandatory.** Every synced block must be wrapped in `<!-- managed:start:<section-id> -->` / `<!-- managed:end:<section-id> -->` pairs. Content inside markers is framework-owned and replaced on sync. Content outside markers is user-owned and never touched. Edits by the user inside managed markers will be overwritten on next sync — this is by design.
- **Selection rule:** The sync copies content from `docs/CLAUDE.md` sections that are consumer-relevant, excluding framework-internal guidance. Eligible sections and their IDs: `code-conventions-must-follow`, `code-conventions-naming`, `code-conventions-folder-structure`, `architecture-notes`, `known-gotchas`. Framework-only bullets within eligible sections (e.g. "Shell scripts use `set -euo pipefail`", source/installed sync tests, hook lifecycle details) must be filtered out — the architecture phase defines the filter mechanism.
- **No-op detection:** Comparison is byte-identical on the managed block content (after normalization of trailing whitespace). Formatting drift or heading renames do not affect matching — markers are the canonical anchor.
- **Malformed marker handling:** If upgrade finds an opening marker without a closing marker (or vice versa), that section is skipped with a warning. The script does not exit non-zero for malformed markers — it continues processing other sections.
- ISS-007 (backup support) is a nice-to-have but not a hard blocker — marker-based sync is non-destructive to content outside markers

### RICE Score
Reach: High (all framework consumers) | Impact: High (eliminates split-brain confusion) | Confidence: High (well-scoped) | Effort: Medium (shell scripting + section parsing) | **Score: 8**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
- Existing `test-install-scripts.sh` tests pass
- New sync-specific test cases pass
