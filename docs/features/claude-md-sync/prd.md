## Feature: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T21:00:00Z
**Phase:** Specify | Date: 2026-04-14
**Ticket:** ISS-008

### User Story
As a framework consumer,
I want `init.sh` and `upgrade.sh` to optionally sync my project's root `CLAUDE.md` with the framework's reference `docs/CLAUDE.md`,
So that my project stays current with new conventions, architecture notes, and known gotchas without losing my project-specific customizations.

### Acceptance Criteria

- [ ] **AC1:** Given `init.sh` is run with `--sync-claude-md`, When the script completes, Then the root `CLAUDE.md` eligible sections are populated with consumer-relevant content from `docs/CLAUDE.md`, filtered by the selection rule (see Dependencies). Each synced block is wrapped in `<!-- managed:start:<section-id> -->` / `<!-- managed:end:<section-id> -->` marker pairs.
- [ ] **AC2:** Given `init.sh` is run without `--sync-claude-md` and a `CLAUDE.md` already exists and stdin is a terminal, When the script reaches the CLAUDE.md step, Then the user is prompted with: (a) overwrite with template, or (b) exit with instructions to re-run with `--sync-claude-md` for section-level sync. Invalid input or EOF defaults to exit (the safer option).
- [ ] **AC2b:** Given `init.sh` is run without `--sync-claude-md` and no `CLAUDE.md` exists, When the script completes, Then the root `CLAUDE.md` is copied as today with placeholder comments intact
- [ ] **AC2c:** Given `init.sh` is run without `--sync-claude-md`, a `CLAUDE.md` already exists, and stdin is not a terminal (CI/piped), When the script reaches the CLAUDE.md step, Then it keeps the existing file, prints a message about `--sync-claude-md`, and continues without prompting
- [ ] **AC3:** Given an existing project with a customized root `CLAUDE.md` containing managed markers, When `upgrade.sh --sync-claude-md` is run, Then content inside managed marker pairs is replaced with the latest reference content, and all content outside managed markers is preserved unchanged
- [ ] **AC3b:** Given `upgrade.sh` is run without `--sync-claude-md`, When the script completes, Then a reminder is printed that `--sync-claude-md` is available for section-level sync
- [ ] **AC3c:** Given an existing project whose `CLAUDE.md` has no managed markers (legacy/pre-sync), When `upgrade.sh --sync-claude-md` is run, Then for each eligible section: the sync locates the section by heading, preserves any existing user content below the managed block, and inserts managed markers with framework content above the user content within that section
- [ ] **AC4:** Given a root `CLAUDE.md` with user-added content outside managed markers (e.g. project-specific gotchas, custom conventions added below the managed block), When sync runs, Then that user content is preserved unchanged in its original position
- [ ] **AC5:** Given sync completes (init or upgrade), When the user views the terminal output, Then the output lists every eligible section with its action: `[added]`, `[updated]`, `[unchanged]`, `[migrated]`, or `[skipped]` (with reason), plus a summary line with counts including any skipped sections. Sections reported as `[migrated]` that have preserved lines include an inline count (e.g. `[migrated, N lines preserved — review for stale text]`). Example: "2 updated, 1 migrated, 0 skipped"
- [ ] **AC6:** Given a root `CLAUDE.md` where a managed section's content is byte-identical to the reference, When sync runs, Then that section is reported as `[unchanged]` and its markers and content are left untouched
- [ ] **AC7:** Given either `init.sh` or `upgrade.sh` completes (with or without `--sync-claude-md`), When the final summary is printed, Then a CLAUDE.md status line is included that reflects the full outcome including any skipped sections (e.g. "CLAUDE.md: synced 3 sections", "CLAUDE.md: synced 2 sections (1 skipped)", "CLAUDE.md: kept existing", "CLAUDE.md: copied template", "CLAUDE.md: not modified — run with --sync-claude-md to sync sections")
- [ ] **AC7b:** Given `--sync-claude-md` is used, a `CLAUDE.md` already exists, and at least one section will be changed, When sync begins, Then a pre-sync backup is saved to `CLAUDE.md.pre-sync` and the output includes: "Backup saved to CLAUDE.md.pre-sync — restore with: mv CLAUDE.md.pre-sync CLAUDE.md". No-op syncs skip backup creation. If the backup cannot be created (permissions, disk full), sync aborts with an error before modifying the original file.
- [ ] **AC8:** Given the existing test suite in `test-install-scripts.sh`, When all tests are run after implementation, Then all existing tests continue to pass
- [ ] **AC9:** Given the implementation is complete, When tests are run, Then new test cases cover: init with sync, upgrade with sync, preservation of user content outside markers, no-op when already in sync, upgrade with missing/malformed markers, legacy migration (no markers → markers with user content preserved), migrated section with preserved-lines advisory output, backup creation failure aborts before modification, non-interactive fallback, defensive prompt when existing CLAUDE.md found, and end-of-script status confirmation

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| Terminal (init --sync-claude-md) | N/A — CLI output only | "Syncing CLAUDE.md sections..." | Per-section action list | (1) docs/CLAUDE.md missing → error + exit 1; (2) not writable → error + exit 1 | Summary + status: "CLAUDE.md: synced N sections" |
| Terminal (init, existing, no flag, interactive) | N/A | N/A | Prompt: "(o)verwrite / (e)xit to re-run with --sync-claude-md?" | N/A | Overwrite: "CLAUDE.md: overwritten with template" / Exit: prints instructions, exits |
| Terminal (init, existing, no flag, non-interactive) | N/A | N/A | N/A | N/A | "CLAUDE.md: kept existing — run with --sync-claude-md to sync sections" |
| Terminal (init, no existing, no flag) | N/A | N/A | N/A | N/A | "CLAUDE.md: copied template" |
| Terminal (upgrade --sync-claude-md) | N/A | "Merging CLAUDE.md sections..." | Per-section action list | (1) source/target missing → error + exit 1; (2) permission denied → error + exit 1; (3) malformed markers → warn + skip section | Summary + status: "CLAUDE.md: synced N sections" |
| Terminal (upgrade --sync-claude-md, legacy) | N/A | "Migrating CLAUDE.md sections..." | Per-section action list with `[migrated]` or `[migrated, N lines preserved — review for stale text]` | Same as above | Summary + status: "CLAUDE.md: migrated N sections (markers added)" |
| Terminal (upgrade, no flag) | N/A | N/A | N/A | N/A | "CLAUDE.md: not modified — run with --sync-claude-md to sync sections" |
| Terminal (no-op sync) | N/A | N/A | N/A | N/A | "CLAUDE.md already in sync — no changes needed" |

### Out of Scope

- Full-file replacement of root `CLAUDE.md` (sync is section-level only)
- Syncing sections specific to framework development (e.g. "What this repo is", "File ownership boundaries", "Cross-Agent Session Context", "Working model", "When modifying the template CLAUDE.md")
- Automatic sync without the `--sync-claude-md` flag (must be opt-in)
- Full backup/restore system for upgrade (tracked separately in ISS-007) — this feature includes only a lightweight single-file pre-sync backup (`CLAUDE.md.pre-sync`), not ISS-007's comprehensive backup infrastructure
- Interactive merge conflict resolution — user edits inside managed markers are overwritten on next sync; user content must go outside markers
- Handling renamed or reordered headings in the target — sync matches by marker ID (if present) or heading text (for legacy migration only)

### Dependencies

- `docs/CLAUDE.md` must exist and contain the reference sections with recognizable markdown headings
- **Managed markers are mandatory for steady-state sync.** Every synced block is wrapped in `<!-- managed:start:<section-id> -->` / `<!-- managed:end:<section-id> -->` pairs. Content inside markers is framework-owned and replaced on sync. Content outside markers is user-owned and never touched.
- **Legacy migration (no markers):** When `--sync-claude-md` encounters a CLAUDE.md without markers, it locates sections by heading text, strips template scaffolding (lines matching `<!-- e.g. ... -->`, `<!-- FILL IN -->`, `- [ ] <!-- ... -->`, and lines byte-identical to the current root template's content for that section), inserts managed markers with framework content at the top of the section, and places remaining content below the closing marker. Migration with preserved lines is considered **successful with advisory** — the sync completes, markers are installed, and the user is prompted inline to review preserved lines for stale framework text. After migration, subsequent syncs use markers.
- **Selection rule (fail-closed):** Eligible sections and their IDs: `code-conventions-must-follow`, `architecture-notes`, `known-gotchas`. Only content explicitly listed in a per-section allowlist syncs to consumer projects — new bullets in `docs/CLAUDE.md` do NOT sync until a maintainer approves them. The architecture phase defines the allowlist and filter mechanism. Not synced: `code-conventions-folder-structure` (root template owns consumer folder structure) and `code-conventions-naming` (no approved downstream content — consumers define their own).
- **No-op detection:** Byte-identical comparison on managed block content (after trailing whitespace normalization). Markers are the canonical anchor.
- **Malformed marker handling:** Unpaired markers → warn + skip section, continue (exit 0).
- **Non-interactive fallback:** If stdin is not a terminal (`! [ -t 0 ]`), skip interactive prompts. Default to keeping existing CLAUDE.md with a message about `--sync-claude-md`.
- **Pre-sync backup:** Before modifying an existing `CLAUDE.md` (only when changes are pending), the sync saves a copy to `CLAUDE.md.pre-sync` and prints restore instructions. No-op syncs skip backup creation, preserving any existing `.pre-sync` from a prior run. When changes are pending and a `.pre-sync` already exists, it is overwritten with the current file.
- ISS-007 (full backup support) is not a hard blocker — marker-based sync is non-destructive to content outside markers, and the pre-sync backup provides a lightweight safety net

### RICE Score
Reach: High (all framework consumers) | Impact: High (eliminates split-brain confusion) | Confidence: High (well-scoped) | Effort: Medium (shell scripting + section parsing) | **Score: 8**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
- Existing `test-install-scripts.sh` tests pass
- New sync-specific test cases pass
