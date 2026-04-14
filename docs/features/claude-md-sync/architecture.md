## Architecture: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T20:30:00Z
**ADR:** ADR-002 | Date: 2026-04-14

### Decision

Implement section-level sync as a pure shell function (`sync_claude_md`) in a new shared
library file `lib/sync-claude-md.sh`, called by both `init.sh` and `upgrade.sh` when the
`--sync-claude-md` flag is passed. The sync uses HTML comment markers
(`<!-- managed:start:<id> -->` / `<!-- managed:end:<id> -->`) as canonical anchors — not
heading text — to identify framework-managed content. A static filter map embedded in the
sync function uses a fail-closed allowlist to select which content from `docs/CLAUDE.md`
is consumer-relevant — only explicitly approved content syncs downstream.

### Decision Confidence
**High** — marker-based approach is well-established (Terraform, Helm), bounded to 3 sections, non-destructive.

### Revisit When
- Eligible sections exceed 10 | Per-bullet granularity requested | ISS-007 changes safety model

### Rollback / Fallback
Remove `--sync-claude-md` flag handling and delete `lib/sync-claude-md.sh`. Root template works without sync (placeholder comments). Markers in consumer files are inert HTML comments.

---

### Module Boundaries

| Module | Responsibility | Must NOT |
|--------|---------------|----------|
| `lib/sync-claude-md.sh` | Parse docs/CLAUDE.md, filter content, read/write markers, produce action report | Access any file outside CLAUDE.md pair; modify init/upgrade control flow |
| `init.sh` | Parse `--sync-claude-md` flag; call sync function after template copy | Contain sync logic inline |
| `upgrade.sh` | Parse `--sync-claude-md` flag; call sync function against existing CLAUDE.md | Contain sync logic inline; touch content outside markers |
| `docs/CLAUDE.md` | Source of truth for framework conventions | Contain managed markers (those belong only in consumer CLAUDE.md) |
| Root `CLAUDE.md` (template) | Consumer-facing template with optional managed markers | Contain framework-development instructions |

### Data Flow

`docs/CLAUDE.md` → `sync_claude_md()` (extract sections → filter → compare → write markers) → root `CLAUDE.md`

Steps: (1) extract eligible sections by heading, (2) filter framework-internal bullets,
(3) for each section: init inserts markers, upgrade replaces between markers or migrates legacy,
(4) byte-compare for no-op detection, (5) print per-section action report + summary.

### Eligible Sections and Allowlist

The filter model is **fail-closed**: only content explicitly listed in the allowlist syncs
to consumer projects. New bullets added to `docs/CLAUDE.md` do NOT sync until a maintainer
adds them to the allowlist. This prevents framework-internal guidance from leaking downstream.

| Section ID | Heading | Allowlist strategy |
|------------|---------|-------------------|
| `code-conventions-must-follow` | `### Must Follow` | Allow: artifact timestamps, skill size budget, separate context, handoff source_spec. Deny all else. |
| `architecture-notes` | `## Architecture Notes` | Allow: ADR Index entries only. Deny framework internals (WHO/WHAT/HOW, handoff.json, hooks). |
| `known-gotchas` | `## Known Gotchas` | Allow: consumer-relevant gotchas only (auth callbacks, Prisma regen, image limits, env vars). Deny framework-specific. |

**Removed:** `code-conventions-folder-structure` (root template owns consumer folder structure)
and `code-conventions-naming` (no approved downstream content — consumers define their own
naming conventions via placeholder comments). Both can be added back when content is approved.

**Allowlist implementation:** A shell array per section listing allowed block anchors (the
first line of each allowed block). Matching operates at block level, not line level: a
"block" is a bullet point plus all its continuation lines (indented text, fenced examples,
sub-bullets) until the next top-level bullet or heading. When an anchor matches, the entire
block (including wrapped lines and attached examples) is included in the managed content.
This prevents partial or malformed output from split multi-line bullets.

**Allowlist drift detection:** A contract test verifies that every anchor in the allowlist
matches at least one block in the current `docs/CLAUDE.md`. If an approved block's first
line is reworded, the test fails with the stale anchor and the new text, prompting a
maintainer to update the allowlist. This runs in the existing `node --test` suite alongside
other sync tests — no additional CI step needed.

### Marker Format

```markdown
<!-- managed:start:known-gotchas -->
- Framework content here (replaced on sync)
<!-- managed:end:known-gotchas -->
- User content here (never touched)
```

Markers are inert HTML comments. Content between = framework-owned (replaced on sync).
Content outside = user-owned (never touched). Unpaired markers → warn + skip.

### Init Path (AC1, AC2, AC2b, AC2c)

```
if --sync-claude-md flag:
  1. Copy CLAUDE.md template (or keep existing)
  2. Call sync_claude_md(docs/CLAUDE.md, target/CLAUDE.md, mode=init)
  3. For each eligible section: insert markers + filtered content replacing placeholder comments
  4. Set CLAUDE_MD_STATUS="synced N sections"
elif existing CLAUDE.md found (no flag):
  if stdin is a terminal ([ -t 0 ]):
    1. Prompt user: (o)verwrite with template / (e)xit to re-run with --sync-claude-md
    2. If overwrite ("o"): cp template → set CLAUDE_MD_STATUS="overwritten with template"
    3. If exit ("e"), invalid input, or EOF: print "Re-run with --sync-claude-md for section-level sync" → exit 0
  else (non-interactive / CI / piped):
    1. Keep existing CLAUDE.md
    2. Set CLAUDE_MD_STATUS="kept existing — run with --sync-claude-md to sync sections"
else (no existing CLAUDE.md, no flag):
  1. Copy CLAUDE.md template as today
  2. Set CLAUDE_MD_STATUS="copied template"
```

### Upgrade Path (AC3, AC3b, AC3c, AC4)

```
if --sync-claude-md flag:
  1. Call sync_claude_md(docs/CLAUDE.md, target/CLAUDE.md, mode=upgrade)
  2. For each eligible section:
     a. Check for managed:start/end markers in target
     b. If markers found: extract content, compare with new filtered content
        - byte-identical (after trailing-ws trim) → report [unchanged]
        - different → replace content between markers → report [updated]
     c. If no markers found (legacy migration):
        - Locate section by heading text
        - Strip template scaffolding (placeholder comments + current-template-matching lines)
        - Insert managed markers with framework content at top of section
        - Place remaining content below closing marker (within same heading)
        - Report [migrated] (with preserved-line count if any remain)
     d. If markers malformed/unpaired: report warning, skip section
  3. All content outside managed markers is untouched (steady-state only;
     legacy migration repositions content — see Legacy Migration Detail)
  4. Set CLAUDE_MD_STATUS based on full outcome:
        - all synced: "synced N sections"
        - any migrated: "migrated N sections (markers added)"
        - any skipped: append "(M skipped)" to status
else (no flag):
  1. Do not touch CLAUDE.md
  2. Set CLAUDE_MD_STATUS="not modified — run with --sync-claude-md to sync sections"
```

### Legacy Migration Detail (AC3c)

When `upgrade.sh --sync-claude-md` encounters a CLAUDE.md without markers, the sync
function migrates each eligible section from heading-based to marker-based ownership.

**Template content stripping:** Before preserving existing content as user-owned, the
migration strips lines matching three categories:
1. **Placeholder comments** — lines matching `<!-- e.g. ... -->`, `<!-- FILL IN -->`, or
   `- [ ] <!-- ... -->` (the template's own guidance markers)
2. **Current template text** — lines byte-identical to the current root template's content
   for that section (read from `$SCRIPT_DIR/CLAUDE.md` at sync time). This catches concrete
   framework text from older templates (e.g. unmodified naming rules, folder structure
   examples) that aren't placeholder comments but are still template boilerplate.
3. **Blank lines** between stripped content (collapsed to avoid orphaned whitespace)

Any remaining content is treated as user-authored. The comparison uses the current template
as the baseline — not a historical version. Lines from older template versions that were
reworded in the current template will be preserved as user content. This is the safer
direction: false preservation (user reviews and removes a stale line) is less harmful than
false stripping (user loses content they wrote).

Before migration (project added one custom gotcha, rest is template):
```markdown
## Known Gotchas
- <!-- e.g. The auth callback URL must be updated in Clerk dashboard -->
- Our custom auth gotcha about SSO timeout
```

After migration:
```markdown
## Known Gotchas
<!-- managed:start:known-gotchas -->
- The auth callback URL must be updated in Clerk dashboard when changing domains
<!-- managed:end:known-gotchas -->
- Our custom auth gotcha about SSO timeout
```

Template placeholder is replaced by managed content; only the user's custom line is preserved.
The preserved-line advisory is part of the per-section action line (not a separate block):
```
  known-gotchas  [migrated, 1 line preserved — review for stale text]
```
This is the single canonical output for a migrated section with preserved content. No
separate warning block. The user can delete any stale lines after reviewing. Subsequent
syncs replace only the content between markers.

### End-of-Script Status Confirmation (AC7)

Both `init.sh` and `upgrade.sh` print a CLAUDE.md status line in their final summary block:

```
=== codingagents init complete ===
  ...existing summary lines...
  CLAUDE.md: <CLAUDE_MD_STATUS>
```

The `CLAUDE_MD_STATUS` variable is set during the CLAUDE.md step and printed at the end.
Possible values:
- `"synced N sections"` — all sections processed successfully
- `"synced N sections (M skipped — see warnings above)"` — partial success with malformed markers
- `"copied template"` — first-time init without sync
- `"overwritten with template"` — user chose overwrite at prompt
- `"kept existing"` — user declined overwrite (legacy path, if retained)
- `"not modified — run with --sync-claude-md to sync sections"` — upgrade without flag
- `"already in sync — no changes needed"` — sync found no differences

### Output Contract (AC5, AC6)

```
Syncing CLAUDE.md sections...
  code-conventions-must-follow  [added]
  architecture-notes            [unchanged]
  known-gotchas                 [updated]
CLAUDE.md sync complete — 1 added, 1 updated, 1 unchanged
```

Actions: `[added]` (init only), `[updated]`, `[unchanged]`, `[migrated]` (legacy upgrade), `[skipped: <reason>]`

Skipped sections always appear in the per-section list with their reason (e.g.
`[skipped: malformed markers]`). The summary line includes skipped counts when non-zero
(e.g. "1 updated, 1 unchanged, 1 skipped").

### Write Safety

**Pre-sync backup (AC7b):** Before any modification, if the target `CLAUDE.md` already exists
and at least one section will be changed, the sync copies it to `CLAUDE.md.pre-sync` in the
same directory and prints:
`"Backup saved to CLAUDE.md.pre-sync — restore with: mv CLAUDE.md.pre-sync CLAUDE.md"`
Backup is only created when changes are pending — no-op syncs skip backup creation to avoid
overwriting a prior backup with an identical file. When changes are pending, any existing
`CLAUDE.md.pre-sync` is overwritten. **If backup creation fails** (permissions, disk full),
sync aborts with an error before creating the temp file — the original is never touched.
This is distinct from ISS-007's full backup system — it's a single-file safety net scoped
to the sync operation.

**Atomic write:** All modifications are performed on a temp file (`CLAUDE.md.tmp`). Only
after all sections are processed is the temp file moved to the final path via `mv` (atomic
on the same filesystem). If interrupted, the original is untouched and the temp file can
be deleted.

**Recovery sequence:** interrupt → original untouched + delete `.tmp`. Bad sync result →
`mv CLAUDE.md.pre-sync CLAUDE.md`. Both paths restore the pre-sync state without git.

### Failure Modes

| Failure | Behavior | Exit code |
|---------|----------|-----------|
| `docs/CLAUDE.md` missing or unreadable | Error message, abort sync | 1 |
| Target `CLAUDE.md` missing (upgrade) | Error message, abort sync | 1 |
| Target `CLAUDE.md` not writable | Error message, abort sync | 1 |
| Backup creation fails (permissions, disk) | Error message, abort before temp file created | 1 |
| Interrupted mid-write | Original untouched; temp file left for cleanup | 1 |
| Managed markers malformed/unpaired | Warning per section, skip that section, continue | 0 |
| Eligible heading not found in source | Warning, skip section, continue | 0 |
| All sections unchanged (no-op) | "CLAUDE.md already in sync — no changes needed" | 0 |

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| `docs/CLAUDE.md` content | Read-only; never executed. Content is markdown text. | Must not be `eval`'d or passed to `source` |
| Target CLAUDE.md content | Read to locate markers (steady-state) or to parse full section bodies for template-vs-user classification (legacy migration). Never executed. | Must not be modified outside managed markers (steady-state). Legacy migration may reposition content but must not delete user-authored lines. |
| `--sync-claude-md` flag | Parsed in arg loop alongside existing flags | Must not change behavior of other flags |

### Fitness Functions

1. **Marker integrity:** After sync, every `managed:start:<id>` has exactly one matching `managed:end:<id>` in the target file — verified by test
2. **User content preservation (steady-state):** For files with existing markers, content outside markers is byte-identical before and after sync — verified by test. Does not apply to legacy migration, which intentionally strips template scaffolding and repositions remaining content.
3. **Filter correctness:** No framework-internal bullet appears in the synced output — verified by test against known exclusion list

### Rejected Alternatives

1. **Full-file replacement with merge tool** — 3-way diff adds tooling deps and merge conflicts
2. **YAML/JSON sidecar** — adds file format/parsing dependency; markers are self-contained
3. **Heading-text matching only (no markers)** — non-deterministic with renames/reordering (used only for legacy migration, then markers take over)
4. **External tool (yq, jq, python)** — framework targets bash-only; shell text processing suffices
