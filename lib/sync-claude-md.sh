#!/usr/bin/env bash
# lib/sync-claude-md.sh — Section-level sync for CLAUDE.md
#
# Syncs eligible sections from docs/CLAUDE.md (source of truth) to consumer
# CLAUDE.md using managed markers (HTML comments) as canonical anchors.
#
# Fail-closed allowlist: only explicitly listed section IDs sync downstream.
# folder-structure and naming are intentionally excluded.
#
# Compatible with bash 3.2+ (macOS default).

# --- Eligible sections (allowlist) ---
# Only these section IDs are allowed to sync. All others are denied.
SYNC_SECTION_COUNT=3

SYNC_SID_0="code-conventions-must-follow"
SYNC_SID_1="architecture-notes"
SYNC_SID_2="known-gotchas"

SYNC_HEADING_0="### Must Follow"
SYNC_HEADING_1="## Architecture Notes"
SYNC_HEADING_2="## Known Gotchas"

SYNC_LEVEL_0=3
SYNC_LEVEL_1=2
SYNC_LEVEL_2=2

_sync_get_sid() { eval echo "\$SYNC_SID_$1"; }
_sync_get_heading() { eval echo "\$SYNC_HEADING_$1"; }
_sync_get_level() { eval echo "\$SYNC_LEVEL_$1"; }

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Extract content under a heading from a file.
# Stops at the next heading of same or higher level, or --- separator.
_sync_extract_section() {
  local file="$1" heading="$2" level="$3"
  awk -v heading="$heading" -v level="$level" '
    $0 == heading { collecting=1; next }
    collecting {
      if ($0 == "---") exit
      if (match($0, /^#+/)) {
        if (RLENGTH <= level) exit
      }
      print
    }
  ' "$file"
}

# Extract content between managed markers from a file.
_sync_extract_managed() {
  local file="$1" sid="$2"
  local sm="<!-- managed:start:${sid} -->"
  local em="<!-- managed:end:${sid} -->"
  awk -v sm="$sm" -v em="$em" '
    $0 == sm { collecting=1; next }
    collecting && $0 == em { exit }
    collecting { print }
  ' "$file"
}

# Trim leading and trailing blank lines from stdin.
_sync_trim() {
  awk '
    /[^[:space:]]/ { found=1 }
    found { lines[++n] = $0 }
    END {
      while (n > 0 && lines[n] ~ /^[[:space:]]*$/) n--
      for (i = 1; i <= n; i++) print lines[i]
    }
  '
}

# Replace content between managed markers in a file.
_sync_replace_managed() {
  local file="$1" sid="$2" cfile="$3"
  local sm="<!-- managed:start:${sid} -->"
  local em="<!-- managed:end:${sid} -->"
  awk -v sm="$sm" -v em="$em" -v cfile="$cfile" '
    $0 == sm {
      print
      while ((getline line < cfile) > 0) print line
      close(cfile)
      replacing=1
      next
    }
    replacing && $0 == em { print; replacing=0; next }
    replacing { next }
    { print }
  ' "$file" > "${file}.awk.tmp" && mv "${file}.awk.tmp" "$file"
}

# Insert managed markers after a heading, replacing old section content.
# Used for init mode (fresh template).
_sync_insert_markers() {
  local file="$1" sid="$2" heading="$3" level="$4" cfile="$5"
  local sm="<!-- managed:start:${sid} -->"
  local em="<!-- managed:end:${sid} -->"
  awk -v heading="$heading" -v sm="$sm" -v em="$em" \
      -v cfile="$cfile" -v level="$level" '
    $0 == heading {
      print
      print sm
      while ((getline line < cfile) > 0) print line
      close(cfile)
      print em
      skipping=1
      next
    }
    skipping {
      if ($0 == "---") { skipping=0; print; next }
      if (match($0, /^#+/)) {
        if (RLENGTH <= level) { skipping=0; print; next }
      }
      next
    }
    { print }
  ' "$file" > "${file}.awk.tmp" && mv "${file}.awk.tmp" "$file"
}

# Migrate a legacy section (no markers) to marker-based.
# Inserts markers + content, preserves non-template user content below.
# Sets SYNC_PRESERVED_LINES global.
_sync_migrate_section() {
  local file="$1" sid="$2" heading="$3" level="$4" cfile="$5"
  local sm="<!-- managed:start:${sid} -->"
  local em="<!-- managed:end:${sid} -->"

  # Extract existing section content, strip template scaffolding
  local preserved_file
  preserved_file=$(mktemp)
  awk -v heading="$heading" -v level="$level" '
    $0 == heading { collecting=1; next }
    collecting {
      if ($0 == "---") exit
      if (match($0, /^#+/)) {
        if (RLENGTH <= level) exit
      }
      if ($0 ~ /^- \[ \] <!-- /) next
      if ($0 ~ /^- <!-- e\.g\./) next
      if ($0 ~ /^<!-- e\.g\./) next
      if ($0 ~ /^<!-- FILL IN/) next
      if ($0 ~ /^[[:space:]]*$/) next
      print
    }
  ' "$file" > "$preserved_file"

  SYNC_PRESERVED_LINES=$(wc -l < "$preserved_file" | tr -d ' ')

  # Rebuild section with markers + preserved user content
  awk -v heading="$heading" -v sm="$sm" -v em="$em" \
      -v cfile="$cfile" -v pfile="$preserved_file" -v level="$level" '
    $0 == heading {
      print
      print sm
      while ((getline line < cfile) > 0) print line
      close(cfile)
      print em
      while ((getline line < pfile) > 0) print line
      close(pfile)
      skipping=1
      next
    }
    skipping {
      if ($0 == "---") { skipping=0; print; next }
      if (match($0, /^#+/)) {
        if (RLENGTH <= level) { skipping=0; print; next }
      }
      next
    }
    { print }
  ' "$file" > "${file}.awk.tmp" && mv "${file}.awk.tmp" "$file"

  rm -f "$preserved_file"
}

# ---------------------------------------------------------------------------
# Main sync function
# ---------------------------------------------------------------------------

# Usage: sync_claude_md <source_path> <target_path> <mode>
#   mode: "init" or "upgrade"
# Sets CLAUDE_MD_STATUS global variable with result summary.
# Prints per-section action report to stdout.
# Returns 0 on success, 1 on error.
sync_claude_md() {
  local source_path="$1"
  local target_path="$2"
  local mode="$3"

  # --- Validate inputs ---
  if [ ! -f "$source_path" ] || [ ! -r "$source_path" ]; then
    echo "Error: Source docs/CLAUDE.md not found or unreadable: $source_path" >&2
    return 1
  fi
  if [ "$mode" = "upgrade" ] && [ ! -f "$target_path" ]; then
    echo "Error: Target CLAUDE.md not found: $target_path" >&2
    return 1
  fi

  # --- Extract source content for each eligible section ---
  # Store content in temp files (bash 3.2 compatible)
  local src_cf_0 src_cf_1 src_cf_2
  local src_trimmed_0 src_trimmed_1 src_trimmed_2
  local idx=0
  while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
    local heading
    heading=$(_sync_get_heading "$idx")
    local level
    level=$(_sync_get_level "$idx")
    local raw
    raw=$(_sync_extract_section "$source_path" "$heading" "$level")
    local trimmed
    trimmed=$(echo "$raw" | _sync_trim)

    local cf
    cf=$(mktemp)
    printf '%s\n' "$trimmed" > "$cf"

    eval "src_cf_${idx}=\"$cf\""
    eval "src_trimmed_${idx}=\"\$trimmed\""
    idx=$((idx + 1))
  done

  # --- Determine action per section ---
  local action_0="" action_1="" action_2=""
  local preserved_0=0 preserved_1=0 preserved_2=0
  local changes_pending=false
  local added=0 updated=0 unchanged=0 migrated=0 skipped=0

  idx=0
  while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
    local sid
    sid=$(_sync_get_sid "$idx")
    local heading
    heading=$(_sync_get_heading "$idx")
    local sm="<!-- managed:start:${sid} -->"
    local em="<!-- managed:end:${sid} -->"
    local action=""

    if [ ! -f "$target_path" ]; then
      action="skipped: no target"
      skipped=$((skipped + 1))
    elif grep -qF "$sm" "$target_path"; then
      if grep -qF "$em" "$target_path"; then
        # Both markers — compare content
        local existing
        existing=$(_sync_extract_managed "$target_path" "$sid" | _sync_trim)
        local new_content
        eval "new_content=\"\$src_trimmed_${idx}\""
        if [ "$existing" = "$new_content" ]; then
          action="unchanged"
          unchanged=$((unchanged + 1))
        else
          action="updated"
          updated=$((updated + 1))
          changes_pending=true
        fi
      else
        action="skipped: malformed markers"
        skipped=$((skipped + 1))
      fi
    elif grep -qxF "$heading" "$target_path"; then
      if [ "$mode" = "init" ]; then
        action="added"
        added=$((added + 1))
        changes_pending=true
      else
        action="migrated"
        migrated=$((migrated + 1))
        changes_pending=true
      fi
    else
      action="skipped: heading not found"
      skipped=$((skipped + 1))
    fi

    eval "action_${idx}=\"\$action\""
    idx=$((idx + 1))
  done

  # --- Pre-sync backup (AC7b) — upgrade mode only ---
  # In init mode, the caller (init.sh) handles backup before template copy.
  if [ "$changes_pending" = true ] && [ "$mode" = "upgrade" ] && [ -f "$target_path" ]; then
    local backup_path="${target_path}.pre-sync"
    # Check backup path is not blocked (e.g., directory or symlink to directory)
    if [ -d "$backup_path" ] || [ -L "$backup_path" ] || ! cp "$target_path" "$backup_path" 2>/dev/null; then
      echo "Error: Failed to create pre-sync backup at $backup_path — aborting sync" >&2
      # Cleanup temp files
      idx=0
      while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
        eval "rm -f \"\$src_cf_${idx}\""
        idx=$((idx + 1))
      done
      return 1
    fi
    echo "Backup saved to CLAUDE.md.pre-sync — restore with: mv CLAUDE.md.pre-sync CLAUDE.md"
  fi

  # --- Apply changes via temp file (atomic write) ---
  local tmp_path="${target_path}.tmp"
  if [ "$changes_pending" = true ]; then
    cp "$target_path" "$tmp_path"

    idx=0
    while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
      local sid
      sid=$(_sync_get_sid "$idx")
      local heading
      heading=$(_sync_get_heading "$idx")
      local level
      level=$(_sync_get_level "$idx")
      local cf
      eval "cf=\"\$src_cf_${idx}\""
      local action
      eval "action=\"\$action_${idx}\""

      case "$action" in
        updated)
          _sync_replace_managed "$tmp_path" "$sid" "$cf"
          ;;
        added)
          _sync_insert_markers "$tmp_path" "$sid" "$heading" "$level" "$cf"
          ;;
        migrated)
          SYNC_PRESERVED_LINES=0
          _sync_migrate_section "$tmp_path" "$sid" "$heading" "$level" "$cf"
          eval "preserved_${idx}=\$SYNC_PRESERVED_LINES"
          ;;
      esac
      idx=$((idx + 1))
    done

    # Atomic move
    mv "$tmp_path" "$target_path"
  fi

  # --- Print per-section report ---
  echo "Syncing CLAUDE.md sections..."
  idx=0
  while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
    local sid
    sid=$(_sync_get_sid "$idx")
    local action
    eval "action=\"\$action_${idx}\""
    local label

    case "$action" in
      added)      label="[added]" ;;
      updated)    label="[updated]" ;;
      unchanged)  label="[unchanged]" ;;
      migrated)
        local pc
        eval "pc=\$preserved_${idx}"
        if [ "$pc" -gt 0 ] 2>/dev/null; then
          label="[migrated, ${pc} lines preserved — review for stale text]"
        else
          label="[migrated]"
        fi
        ;;
      skipped:*)
        local reason="${action#skipped: }"
        label="[skipped: ${reason}]"
        ;;
      *)          label="[${action}]" ;;
    esac

    printf "  %-35s %s\n" "$sid" "$label"
    idx=$((idx + 1))
  done

  # --- Summary line ---
  local parts=""
  [ "$added" -gt 0 ] && parts="${parts}${added} added, "
  [ "$updated" -gt 0 ] && parts="${parts}${updated} updated, "
  [ "$unchanged" -gt 0 ] && parts="${parts}${unchanged} unchanged, "
  [ "$migrated" -gt 0 ] && parts="${parts}${migrated} migrated, "
  [ "$skipped" -gt 0 ] && parts="${parts}${skipped} skipped, "
  # Remove trailing ", "
  parts="${parts%, }"

  local total=$((added + updated + migrated))
  if [ "$total" -eq 0 ] && [ "$unchanged" -gt 0 ] && [ "$skipped" -eq 0 ]; then
    echo "CLAUDE.md already in sync — no changes needed"
    CLAUDE_MD_STATUS="already in sync — no changes needed"
  else
    echo "CLAUDE.md sync complete — ${parts}"

    if [ "$migrated" -gt 0 ]; then
      CLAUDE_MD_STATUS="migrated ${migrated} sections (markers added)"
      [ "$skipped" -gt 0 ] && CLAUDE_MD_STATUS="${CLAUDE_MD_STATUS}, ${skipped} skipped"
    elif [ "$skipped" -gt 0 ]; then
      CLAUDE_MD_STATUS="synced $((added + updated + unchanged)) sections (${skipped} skipped — see warnings above)"
    else
      CLAUDE_MD_STATUS="synced $((added + updated + unchanged)) sections"
    fi
  fi

  # --- Cleanup temp files ---
  idx=0
  while [ "$idx" -lt "$SYNC_SECTION_COUNT" ]; do
    eval "rm -f \"\$src_cf_${idx}\""
    idx=$((idx + 1))
  done

  return 0
}
