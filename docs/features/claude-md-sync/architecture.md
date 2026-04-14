## Architecture: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T16:30:00Z
**ADR:** ADR-002 | Date: 2026-04-14

### Decision

Implement section-level sync as a pure shell function (`sync_claude_md`) in a new shared
library file `lib/sync-claude-md.sh`, called by both `init.sh` and `upgrade.sh` when the
`--sync-claude-md` flag is passed. The sync uses HTML comment markers
(`<!-- managed:start:<id> -->` / `<!-- managed:end:<id> -->`) as canonical anchors — not
heading text — to identify framework-managed content. A static filter map embedded in the
sync function defines which bullets from `docs/CLAUDE.md` are consumer-relevant vs
framework-internal.

### Decision Confidence
**High** — the marker-based approach is well-established (Terraform, Helm, etc.), the scope is
bounded to 5 sections, and the mechanism is non-destructive to content outside markers.

### Revisit When
- The number of eligible sections exceeds 10 (filter map becomes unwieldy)
- A consumer requests per-bullet granularity for managed content (currently section-level)
- ISS-007 (backup support) lands and changes the pre-sync safety model

### Rollback / Fallback
Remove the `--sync-claude-md` flag handling from init.sh/upgrade.sh and delete
`lib/sync-claude-md.sh`. The root CLAUDE.md template remains functional without sync —
it just has placeholder comments instead of populated sections. Managed markers left in
existing consumer CLAUDE.md files are inert HTML comments with no runtime effect.

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

```
docs/CLAUDE.md (source)
    │
    ▼
sync_claude_md()
    ├── 1. Extract eligible sections by heading (## Code Conventions, etc.)
    ├── 2. Filter out framework-internal bullets via FILTER_MAP
    ├── 3. For each section:
    │       ├── init path: insert managed markers + content into template
    │       └── upgrade path: find existing markers → replace content between them
    ├── 4. Compare new vs existing content (byte-identical after trailing-ws trim)
    │       └── unchanged → skip; changed → replace; missing markers → warn+skip
    └── 5. Print per-section action report + summary line
    │
    ▼
Root CLAUDE.md (target)
```

### Eligible Sections and Filter Map

| Section ID | Source heading in docs/CLAUDE.md | Target heading in root CLAUDE.md | Filter |
|------------|--------------------------------|----------------------------------|--------|
| `code-conventions-must-follow` | `### Must Follow` (under `## Code Conventions`) | `### Must Follow` (under `## Code Conventions`) | Exclude bullets containing: "Shell scripts use", "Source and installed copies", "source paths (`skills/...`)", "`set -euo pipefail`" |
| `code-conventions-naming` | `### Naming` | `### Naming` | Exclude: "Roles: `ROLE_UPPER_SNAKE`", "Skills: `skills/kebab-case`", "Commands: `commands/kebab-case`", "Feature artifacts:", "Test fixtures:" |
| `code-conventions-folder-structure` | `### Folder Structure` | `### Folder Structure` | Exclude entirely — framework folder structure is repo-specific. Replace with consumer-oriented structure from root template |
| `architecture-notes` | `## Architecture Notes` (all subsections) | `## Architecture Notes` | Exclude: "Core abstraction: WHO / WHAT / HOW", "Phase contract: handoff.json", "Hooks lifecycle", "ADR Index" framework entries |
| `known-gotchas` | `## Known Gotchas` | `## Known Gotchas` | Exclude bullets mentioning: "checkpoint.js", "commands reference installed skill paths", "`docs/CLAUDE.md` is auto-loaded", "settings.json (hooks)", "backlog system", "Source/installed helper drift", "Phrase-bound tests", "Feature slug naming mismatch", "`upgrade.sh` idempotency", "Integration tests depend on architecture" |

**Design note:** The filter is implemented as a shell associative array (bash 4+) or a
series of `grep -v` patterns. Each pattern is a literal substring match — no regex. When a
new bullet is added to `docs/CLAUDE.md`, it syncs by default unless explicitly excluded.
This is deliberate: new conventions should reach consumers unless they are framework-internal.

### Marker Format

```markdown
<!-- managed:start:known-gotchas -->
- The auth callback URL must be updated in Clerk dashboard when changing domains
- Prisma client must be regenerated after schema changes: `pnpm db:generate`
<!-- managed:end:known-gotchas -->
```

Rules:
- Markers are HTML comments — invisible in rendered markdown
- Content between markers is framework-owned; replaced entirely on sync
- User content goes above or below the marker pair, never inside
- If an opening marker exists without its closing pair (or vice versa), the section is
  skipped with a warning — no partial replacement

### Init Path (AC1, AC2, AC2b)

```
if --sync-claude-md flag:
  1. Copy CLAUDE.md template (or keep existing)
  2. Call sync_claude_md(docs/CLAUDE.md, target/CLAUDE.md, mode=init)
  3. For each eligible section: insert markers + filtered content replacing placeholder comments
  4. Set CLAUDE_MD_STATUS="synced N sections"
elif existing CLAUDE.md found (no flag):
  1. Prompt user: (o)verwrite with template / (e)xit to re-run with --sync-claude-md
  2. If overwrite: cp template → set CLAUDE_MD_STATUS="overwritten with template"
  3. If exit: print "Re-run with --sync-claude-md for section-level sync" → exit 0
else (no existing CLAUDE.md, no flag):
  1. Copy CLAUDE.md template as today
  2. Set CLAUDE_MD_STATUS="copied template"
```

### Upgrade Path (AC3, AC3b, AC4)

```
if --sync-claude-md flag:
  1. Call sync_claude_md(docs/CLAUDE.md, target/CLAUDE.md, mode=upgrade)
  2. For each eligible section:
     a. Find managed:start/end markers in target
     b. If found: extract content, compare with new filtered content
        - byte-identical (after trailing-ws trim) → report [unchanged]
        - different → replace content between markers → report [updated]
     c. If markers missing: report warning, skip section
  3. All content outside markers is untouched
  4. Set CLAUDE_MD_STATUS="synced N sections"
else (no flag):
  1. Do not touch CLAUDE.md
  2. Set CLAUDE_MD_STATUS="not modified — run with --sync-claude-md to sync sections"
```

### End-of-Script Status Confirmation (AC7)

Both `init.sh` and `upgrade.sh` print a CLAUDE.md status line in their final summary block:

```
=== codingagents init complete ===
  ...existing summary lines...
  CLAUDE.md: <CLAUDE_MD_STATUS>
```

The `CLAUDE_MD_STATUS` variable is set during the CLAUDE.md step and printed at the end.
Possible values:
- `"synced N sections"` — sync ran successfully
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

Actions: `[added]` (init only), `[updated]`, `[unchanged]`, `[skipped:malformed-markers]`

### Failure Modes

| Failure | Behavior | Exit code |
|---------|----------|-----------|
| `docs/CLAUDE.md` missing or unreadable | Error message, abort sync | 1 |
| Target `CLAUDE.md` missing (upgrade) | Error message, abort sync | 1 |
| Target `CLAUDE.md` not writable | Error message, abort sync | 1 |
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

1. **Full-file replacement with merge tool** — rejected because it requires 3-way diff tooling,
   introduces merge conflicts, and doesn't preserve user content reliably
2. **YAML/JSON sidecar for section content** — rejected because it adds a new file format and
   parsing dependency; markdown-in-markdown with markers is self-contained
3. **Heading-text matching (no markers)** — rejected because heading renames, reordering, or
   user-added headings with similar names make matching non-deterministic
4. **External tool (yq, jq, python)** — rejected because the framework targets `bash` with no
   additional runtime dependencies; shell text processing is sufficient for section-level ops
