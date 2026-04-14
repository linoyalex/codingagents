## Feature: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T12:00:00Z
**Phase:** Specify | Date: 2026-04-14
**Ticket:** ISS-008

### User Story
As a framework consumer,
I want `init.sh` and `upgrade.sh` to optionally sync my project's root `CLAUDE.md` with the framework's reference `docs/CLAUDE.md`,
So that my project stays current with new conventions, naming rules, folder structure, architecture notes, and known gotchas without losing my project-specific customizations.

### Acceptance Criteria

- [ ] **AC1:** Given `init.sh` is run with `--sync-claude-md`, When the script completes, Then the root `CLAUDE.md` template sections (Code Conventions, Naming, Folder Structure, Architecture Notes, Known Gotchas) are populated with content from `docs/CLAUDE.md`
- [ ] **AC2:** Given `init.sh` is run without `--sync-claude-md`, When the script completes, Then the root `CLAUDE.md` is copied as today with placeholder comments intact
- [ ] **AC3:** Given an existing project with a customized root `CLAUDE.md`, When `upgrade.sh --sync-claude-md` is run, Then new or updated sections from `docs/CLAUDE.md` are merged into the root `CLAUDE.md` without overwriting user-customized content
- [ ] **AC4:** Given a root `CLAUDE.md` with user-added content (e.g. project-specific gotchas, custom conventions), When sync runs, Then those user-owned sections are preserved unchanged
- [ ] **AC5:** Given sync completes (init or upgrade), When the user views the terminal output, Then a diff or summary is printed showing what was added or updated in root `CLAUDE.md`
- [ ] **AC6:** Given a root `CLAUDE.md` that already contains a section matching the reference content, When sync runs, Then that section is skipped (no duplicates introduced)
- [ ] **AC7:** Given the existing test suite in `test-install-scripts.sh`, When all tests are run after implementation, Then all existing tests continue to pass
- [ ] **AC8:** Given the implementation is complete, When tests are run, Then new test cases cover: init with sync, upgrade with sync, preservation of user content, and no-op when already in sync

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| Terminal (init --sync-claude-md) | N/A — CLI output only | "Syncing CLAUDE.md sections..." progress line | Diff/summary of added sections printed to stdout | Error message if docs/CLAUDE.md is missing or unreadable; exit non-zero | "CLAUDE.md sync complete — N sections updated" confirmation |
| Terminal (upgrade --sync-claude-md) | N/A | "Merging CLAUDE.md sections..." progress line | Diff/summary of merged sections printed to stdout | Error message if root CLAUDE.md or docs/CLAUDE.md is missing; exit non-zero | "CLAUDE.md sync complete — N sections merged, M preserved" confirmation |
| Terminal (no-op sync) | N/A | N/A | N/A | N/A | "CLAUDE.md already in sync — no changes needed" |

### Out of Scope

- Full-file replacement of root `CLAUDE.md` (sync is section-level only)
- Syncing sections that are specific to framework development (e.g. "What this repo is", "File ownership boundaries", "Cross-Agent Session Context")
- Automatic sync without the `--sync-claude-md` flag (must be opt-in)
- Backup/restore of `CLAUDE.md` before sync (tracked separately in ISS-007)
- Interactive merge conflict resolution (framework sections win for managed content; user sections are never touched)

### Dependencies

- `docs/CLAUDE.md` must exist and contain the reference sections with recognizable markdown headings
- The sync mechanism uses markdown heading markers (e.g. `## Code Conventions`, `## Known Gotchas`) as merge boundaries
- A marker comment (e.g. `<!-- managed by codingagents -->`) should distinguish framework-managed content from user-added content, enabling safe re-sync on subsequent upgrades
- Sections eligible for sync: Code Conventions (Must Follow, Naming, Folder Structure subsections), Architecture Notes, Known Gotchas
- ISS-007 (backup support) is a nice-to-have but not a hard blocker — section-level sync with markers is non-destructive

### RICE Score
Reach: High (all framework consumers) | Impact: High (eliminates split-brain confusion) | Confidence: High (well-scoped) | Effort: Medium (shell scripting + section parsing) | **Score: 8**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
- Existing `test-install-scripts.sh` tests pass
- New sync-specific test cases pass
