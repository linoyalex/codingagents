## Architecture: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T18:00:00Z
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
    2. If overwrite: cp template → set CLAUDE_MD_STATUS="overwritten with template"
    3. If exit: print "Re-run with --sync-claude-md for section-level sync" → exit 0
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
        - Treat all existing content under that heading as user content
        - Insert managed markers with framework content at top of section
        - Place existing user content below closing marker (within same heading)
        - Report [migrated]
     d. If markers malformed/unpaired: report warning, skip section
  3. All content outside managed markers is untouched
  4. Set CLAUDE_MD_STATUS="synced N sections" (or "migrated N sections" if any [migrated])
else (no flag):
  1. Do not touch CLAUDE.md
  2. Set CLAUDE_MD_STATUS="not modified — run with --sync-claude-md to sync sections"
```

### Legacy Migration Detail (AC3c)

When `upgrade.sh --sync-claude-md` encounters a CLAUDE.md without markers, the sync
function migrates each eligible section from heading-based to marker-based ownership.

**Template content stripping:** Before preserving existing content as user-owned, the
migration strips lines matching two deterministic patterns — no version lookup needed:
1. **Placeholder comments** — lines matching `<!-- e.g. ... -->` or `<!-- FILL IN -->` (the
   template's own guidance markers, recognizable by format regardless of framework version)
2. **Unchecked checklist items** — lines matching `- [ ] <!-- ... -->` (empty template slots)

Any remaining non-blank content is treated as user-authored. This is conservative: if a user
wrote something that happens to look like a placeholder comment, it would be stripped — but
that pattern is extremely unlikely in practice. No version file lookup is required.

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
Subsequent syncs replace only the content between markers.

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
  code-conventions-naming       [added]
  architecture-notes            [unchanged]
  known-gotchas                 [updated]
CLAUDE.md sync complete — 2 added, 1 updated, 1 unchanged
```

Actions: `[added]` (init only), `[updated]`, `[unchanged]`, `[migrated]` (legacy upgrade), `[skipped:malformed-markers]`

### Write Safety

All modifications to the target `CLAUDE.md` are performed on a temp file (`CLAUDE.md.tmp`
in the same directory). Only after all sections are processed successfully is the temp file
moved to the final path via `mv` (atomic on the same filesystem). If the process is
interrupted, the original file is untouched and the temp file can be deleted.

### Failure Modes

| Failure | Behavior | Exit code |
|---------|----------|-----------|
| `docs/CLAUDE.md` missing or unreadable | Error message, abort sync | 1 |
| Target `CLAUDE.md` missing (upgrade) | Error message, abort sync | 1 |
| Target `CLAUDE.md` not writable | Error message, abort sync | 1 |
| Interrupted mid-write | Original untouched; temp file left for cleanup | 1 |
| Managed markers malformed/unpaired | Warning per section, skip that section, continue | 0 |
| Eligible heading not found in source | Warning, skip section, continue | 0 |
| All sections unchanged (no-op) | "CLAUDE.md already in sync — no changes needed" | 0 |

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| `docs/CLAUDE.md` content | Read-only; never executed. Content is markdown text. | Must not be `eval`'d or passed to `source` |
| Target CLAUDE.md user content | Never read by sync logic except to locate markers | Must not be modified, reordered, or deleted |
| `--sync-claude-md` flag | Parsed in arg loop alongside existing flags | Must not change behavior of other flags |

### Fitness Functions

1. **Marker integrity:** After sync, every `managed:start:<id>` has exactly one matching `managed:end:<id>` in the target file — verified by test
2. **User content preservation:** Content outside markers is byte-identical before and after sync — verified by test
3. **Filter correctness:** No framework-internal bullet appears in the synced output — verified by test against known exclusion list

### Rejected Alternatives

1. **Full-file replacement with merge tool** — 3-way diff adds tooling deps and merge conflicts
2. **YAML/JSON sidecar** — adds file format/parsing dependency; markers are self-contained
3. **Heading-text matching only (no markers)** — non-deterministic with renames/reordering (used only for legacy migration, then markers take over)
4. **External tool (yq, jq, python)** — framework targets bash-only; shell text processing suffices
