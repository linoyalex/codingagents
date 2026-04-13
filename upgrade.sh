#!/usr/bin/env bash
# upgrade.sh — Upgrade an existing project to the latest codingagents version
#
# Usage:
#   bash /path/to/codingagents/upgrade.sh                    # Upgrade core pipeline only
#   bash /path/to/codingagents/upgrade.sh --codex             # Upgrade core + install/upgrade Codex
#   bash /path/to/codingagents/upgrade.sh --codex --verbose   # With full trace output
#
# Components are tracked independently. Running with --codex on a project
# already at the current core version will skip core and install Codex only.
#
# Run from the root of the target project.
# Creates a backup before making changes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$(pwd)"
WITH_CODEX=false
VERBOSE=false
NEW_VERSION="v5"
VERSION_FILE="$TARGET_DIR/.claude/.codingagents-version"

for arg in "$@"; do
  case "$arg" in
    --codex) WITH_CODEX=true ;;
    --verbose) VERBOSE=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# Enable trace mode for verbose output
if [ "$VERBOSE" = true ]; then
  set -x
fi

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo "  [verbose] $*"
  fi
}

# --- Component version helpers ---
get_component_version() {
  local component="$1" line=""
  [ -f "$VERSION_FILE" ] || return 0
  line=$(grep "^${component}=" "$VERSION_FILE" 2>/dev/null || true)
  [ -n "$line" ] && echo "${line#*=}" | tr -d '[:space:]'
  return 0
}

set_component_version() {
  local component="$1" version="$2"
  mkdir -p "$(dirname "$VERSION_FILE")"
  if [ -f "$VERSION_FILE" ] && grep -q "^${component}=" "$VERSION_FILE" 2>/dev/null; then
    sed -i '' "s/^${component}=.*/${component}=${version}/" "$VERSION_FILE"
  else
    echo "${component}=${version}" >> "$VERSION_FILE"
  fi
}

# --- Migrate legacy single-line version file ---
if [ -f "$VERSION_FILE" ] && ! grep -q "=" "$VERSION_FILE" 2>/dev/null; then
  LEGACY_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
  echo "core=$LEGACY_VERSION" > "$VERSION_FILE"
  echo "Migrated legacy version file (was: $LEGACY_VERSION)"
fi

# --- Detect what needs upgrading ---
CURRENT_CORE=$(get_component_version "core")
CURRENT_CODEX=$(get_component_version "codex")

# Default: assume v4.1 if no core version found
if [ -z "$CURRENT_CORE" ]; then
  CURRENT_CORE="v4.1"
  echo "No core version found. Assuming $CURRENT_CORE."
fi

log_verbose "VERSION_FILE=$VERSION_FILE"
log_verbose "Existing version file: $(cat "$VERSION_FILE" 2>/dev/null || echo 'not found')"
log_verbose "CURRENT_CORE=$CURRENT_CORE"
log_verbose "CURRENT_CODEX=$CURRENT_CODEX"
log_verbose "WITH_CODEX=$WITH_CODEX"
log_verbose "codex dir exists: $([ -d "$TARGET_DIR/codex/reviewers" ] && echo 'yes' || echo 'no')"

CORE_NEEDS_UPGRADE=false
CODEX_NEEDS_INSTALL=false

if [ "$CURRENT_CORE" != "$NEW_VERSION" ]; then
  CORE_NEEDS_UPGRADE=true
fi

if [ "$WITH_CODEX" = true ]; then
  if [ -z "$CURRENT_CODEX" ] || [ "$CURRENT_CODEX" != "$NEW_VERSION" ]; then
    CODEX_NEEDS_INSTALL=true
  # Version file says installed, but directory is missing — reinstall
  elif [ ! -d "$TARGET_DIR/codex/reviewers" ]; then
    CODEX_NEEDS_INSTALL=true
    echo "Note: codex=$CURRENT_CODEX in version file but codex/ directory is missing. Will reinstall."
  fi
fi

log_verbose "CORE_NEEDS_UPGRADE=$CORE_NEEDS_UPGRADE"
log_verbose "CODEX_NEEDS_INSTALL=$CODEX_NEEDS_INSTALL"

if [ "$CORE_NEEDS_UPGRADE" = false ] && [ "$CODEX_NEEDS_INSTALL" = false ]; then
  echo "All requested components are at version $NEW_VERSION. Nothing to upgrade."
  echo ""
  if [ "$WITH_CODEX" = false ] && [ -z "$CURRENT_CODEX" ]; then
    echo "Tip: Run with --codex to install the Codex review layer."
  fi
  exit 0
fi

echo "=== codingagents upgrade ==="
echo "Source:   $SCRIPT_DIR"
echo "Target:   $TARGET_DIR"
echo ""

# --- Show what will change ---
echo "This upgrade will:"
if [ "$CORE_NEEDS_UPGRADE" = true ]; then
  echo "  [core] Upgrade $CURRENT_CORE → $NEW_VERSION"
  echo "    - Back up .claude/ to .claude.backup-$CURRENT_CORE/"
  echo "    - Replace hook files (checkpoint.js, restore-context.js, archive-context.js)"
  echo "    - Replace role files in .claude/agents/"
  echo "    - Replace skill files in .claude/skills/"
  echo "    - Add schemas/ directory"
  echo "    - Create docs/features/ and docs/decisions/ if missing"
  echo "    - Update .gitignore with new runtime artifact patterns"
else
  echo "  [core] Already at $NEW_VERSION — skipping"
fi
if [ "$CODEX_NEEDS_INSTALL" = true ]; then
  if [ -z "$CURRENT_CODEX" ]; then
    echo "  [codex] Install $NEW_VERSION (new)"
  else
    echo "  [codex] Upgrade $CURRENT_CODEX → $NEW_VERSION"
  fi
  if [ -d "$TARGET_DIR/codex" ]; then
    echo "    - Back up codex/ to codex.backup-$CURRENT_CODEX/"
  fi
  echo "    - Copy reviewer prompts, templates, scripts, and docs"
fi
echo ""
echo "  Will NOT touch: CLAUDE.md, docs/, src/, runtime artifacts"
echo ""

read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ===========================================
# Core pipeline upgrade
# ===========================================
if [ "$CORE_NEEDS_UPGRADE" = true ]; then
  echo ""
  echo "[1/4] Creating backup..."
  BACKUP_DIR="$TARGET_DIR/.claude.backup-$CURRENT_CORE"
  if [ -d "$BACKUP_DIR" ]; then
    echo "  Backup already exists at $BACKUP_DIR — skipping backup."
  else
    cp -r "$TARGET_DIR/.claude" "$BACKUP_DIR"
    echo "  Backed up .claude/ to $BACKUP_DIR"
  fi

  # --- Run version-specific migration ---
  echo "[2/4] Running migration..."
  MIGRATION_SCRIPT="$SCRIPT_DIR/migrations/${CURRENT_CORE}-to-${NEW_VERSION}.sh"
  if [ -f "$MIGRATION_SCRIPT" ]; then
    echo "  Running $MIGRATION_SCRIPT"
    bash "$MIGRATION_SCRIPT" "$SCRIPT_DIR" "$TARGET_DIR"
  else
    echo "  No migration script found for $CURRENT_CORE → $NEW_VERSION."
    echo "  Performing generic upgrade (replace framework files)."
  fi

  # --- Replace framework files ---
  echo "[3/4] Updating hooks, roles, skills, and schemas..."
  cp "$SCRIPT_DIR/hooks/checkpoint.js" "$TARGET_DIR/.claude/helpers/checkpoint.js"
  cp "$SCRIPT_DIR/hooks/archive-context.js" "$TARGET_DIR/.claude/helpers/archive-context.js"
  cp "$SCRIPT_DIR/hooks/restore-context.js" "$TARGET_DIR/.claude/helpers/restore-context.js"
  cp "$SCRIPT_DIR/hooks/resolve-feature.js" "$TARGET_DIR/.claude/helpers/resolve-feature.js"
  cp "$SCRIPT_DIR/hooks/settings.json" "$TARGET_DIR/.claude/settings.json"

  # Roles
  for role in "$SCRIPT_DIR"/ROLE_*.md; do
    cp "$role" "$TARGET_DIR/.claude/agents/$(basename "$role")"
  done

  # Skills
  if [ -d "$SCRIPT_DIR/skills" ]; then
    mkdir -p "$TARGET_DIR/.claude/skills"
    cp -r "$SCRIPT_DIR"/skills/* "$TARGET_DIR/.claude/skills/" 2>/dev/null || true
  fi
  mkdir -p "$TARGET_DIR/.claude/skills/architecture-decision"
  cp "$SCRIPT_DIR/skills/architecture-decision/SKILL.md" "$TARGET_DIR/.claude/skills/architecture-decision/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/backlog-management"
  cp "$SCRIPT_DIR/skills/backlog-management/SKILL.md" "$TARGET_DIR/.claude/skills/backlog-management/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/code-review"
  cp "$SCRIPT_DIR/skills/code-review/SKILL.md" "$TARGET_DIR/.claude/skills/code-review/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/prd-writing"
  cp "$SCRIPT_DIR/skills/prd-writing/SKILL.md" "$TARGET_DIR/.claude/skills/prd-writing/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/release-docs"
  cp "$SCRIPT_DIR/skills/release-docs/SKILL.md" "$TARGET_DIR/.claude/skills/release-docs/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/security-audit"
  cp "$SCRIPT_DIR/skills/security-audit/SKILL.md" "$TARGET_DIR/.claude/skills/security-audit/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/structured-logging"
  cp "$SCRIPT_DIR/skills/structured-logging/SKILL.md" "$TARGET_DIR/.claude/skills/structured-logging/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/tdd"
  cp "$SCRIPT_DIR/skills/tdd/SKILL.md" "$TARGET_DIR/.claude/skills/tdd/SKILL.md" 2>/dev/null || true
  mkdir -p "$TARGET_DIR/.claude/skills/verification-gate"
  cp "$SCRIPT_DIR/skills/verification-gate/SKILL.md" "$TARGET_DIR/.claude/skills/verification-gate/SKILL.md" 2>/dev/null || true

  # Schemas
  mkdir -p "$TARGET_DIR/.claude/schemas"
  cp -r "$SCRIPT_DIR/schemas/"* "$TARGET_DIR/.claude/schemas/" 2>/dev/null || true

  # Commands
  if [ -d "$SCRIPT_DIR/commands" ]; then
    mkdir -p "$TARGET_DIR/.claude/commands"
    cp "$SCRIPT_DIR"/commands/*.md "$TARGET_DIR/.claude/commands/" 2>/dev/null || true
  fi
  cp "$SCRIPT_DIR/commands/architect.md" "$TARGET_DIR/.claude/commands/architect.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/document.md" "$TARGET_DIR/.claude/commands/document.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/implement.md" "$TARGET_DIR/.claude/commands/implement.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/review.md" "$TARGET_DIR/.claude/commands/review.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/security-gate.md" "$TARGET_DIR/.claude/commands/security-gate.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/session-note.md" "$TARGET_DIR/.claude/commands/session-note.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/specify.md" "$TARGET_DIR/.claude/commands/specify.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/status.md" "$TARGET_DIR/.claude/commands/status.md" 2>/dev/null || true
  cp "$SCRIPT_DIR/commands/test-design.md" "$TARGET_DIR/.claude/commands/test-design.md" 2>/dev/null || true

  # Create new doc structure directories
  mkdir -p "$TARGET_DIR/docs/features"
  mkdir -p "$TARGET_DIR/docs/decisions"

  # --- .gitignore update ---
  echo "[4/4] Updating .gitignore..."
  touch "$TARGET_DIR/.gitignore"
  TEMPLATE="$SCRIPT_DIR/.gitignore-template"
  if [ -f "$TEMPLATE" ]; then
    while IFS= read -r entry || [ -n "$entry" ]; do
      [ -z "$entry" ] && continue
      if ! grep -qF "$entry" "$TARGET_DIR/.gitignore" 2>/dev/null; then
        echo "$entry" >> "$TARGET_DIR/.gitignore"
      fi
    done < "$TEMPLATE"
  else
    echo "  Warning: .gitignore-template not found at $TEMPLATE"
  fi

  set_component_version "core" "$NEW_VERSION"
  echo "  Core pipeline upgraded to $NEW_VERSION."
else
  echo ""
  echo "[core] Already at $NEW_VERSION — skipping."
fi

# ===========================================
# Codex review layer (independent of core)
# ===========================================
if [ "$CODEX_NEEDS_INSTALL" = true ]; then
  echo ""

  # Backup existing codex if upgrading (not fresh install)
  if [ -n "$CURRENT_CODEX" ] && [ -d "$TARGET_DIR/codex" ]; then
    CODEX_BACKUP="$TARGET_DIR/codex.backup-$CURRENT_CODEX"
    if [ -d "$CODEX_BACKUP" ]; then
      echo "  Codex backup already exists — skipping."
    else
      cp -r "$TARGET_DIR/codex" "$CODEX_BACKUP"
      echo "  Backed up codex/ to $CODEX_BACKUP"
    fi
  fi

  echo "[codex] Installing Codex review layer..."
  log_verbose "Source codex dir: $SCRIPT_DIR/codex/"
  log_verbose "Source codex contents: $(ls "$SCRIPT_DIR/codex/" 2>/dev/null || echo 'MISSING')"
  log_verbose "Target codex dir: $TARGET_DIR/codex/"
  mkdir -p "$TARGET_DIR/codex/reviewers"
  mkdir -p "$TARGET_DIR/codex/templates"
  mkdir -p "$TARGET_DIR/codex/reviews"

  if [ -d "$SCRIPT_DIR/codex/reviewers" ]; then
    cp "$SCRIPT_DIR"/codex/reviewers/*.md "$TARGET_DIR/codex/reviewers/" 2>/dev/null || true
    log_verbose "Copied reviewers: $(ls "$TARGET_DIR/codex/reviewers/" 2>/dev/null)"
  else
    log_verbose "WARNING: Source codex/reviewers/ does not exist at $SCRIPT_DIR/codex/reviewers"
  fi

  if [ -d "$SCRIPT_DIR/codex/templates" ]; then
    cp "$SCRIPT_DIR"/codex/templates/* "$TARGET_DIR/codex/templates/" 2>/dev/null || true
    log_verbose "Copied templates: $(ls "$TARGET_DIR/codex/templates/" 2>/dev/null)"
  else
    log_verbose "WARNING: Source codex/templates/ does not exist at $SCRIPT_DIR/codex/templates"
  fi

  for script in log-usage.sh report-usage.sh; do
    if [ -f "$SCRIPT_DIR/codex/$script" ]; then
      cp "$SCRIPT_DIR/codex/$script" "$TARGET_DIR/codex/$script"
      chmod +x "$TARGET_DIR/codex/$script"
      log_verbose "Copied and chmod +x: $script"
    else
      log_verbose "WARNING: $SCRIPT_DIR/codex/$script not found"
    fi
  done

  for doc in README.md fresh-context-playbook.md; do
    if [ -f "$SCRIPT_DIR/codex/$doc" ]; then
      cp "$SCRIPT_DIR/codex/$doc" "$TARGET_DIR/codex/$doc"
      log_verbose "Copied doc: $doc"
    else
      log_verbose "WARNING: $SCRIPT_DIR/codex/$doc not found"
    fi
  done

  set_component_version "codex" "$NEW_VERSION"
  log_verbose "Wrote codex=$NEW_VERSION to version file"
  log_verbose "Codex files installed: $(ls "$TARGET_DIR/codex/" 2>/dev/null || echo 'NONE')"
  echo "  Codex review layer installed at $NEW_VERSION."
fi

# --- Summary ---
echo ""
echo "=== Upgrade complete ==="
echo "Installed components:"
cat "$VERSION_FILE"
echo ""

if [ "$CORE_NEEDS_UPGRADE" = true ]; then
  echo "IMPORTANT: Review CLAUDE.md manually for new sections:"
  echo "  - Phase Handoff Protocol"
  echo "  - Memory & Instruction Governance"
  echo "See $SCRIPT_DIR/CLAUDE.md for the template."
  echo ""
fi

echo "To rollback:"
if [ "$CORE_NEEDS_UPGRADE" = true ]; then
  echo "  rm -rf .claude && mv .claude.backup-$CURRENT_CORE .claude"
fi
if [ "$CODEX_NEEDS_INSTALL" = true ] && [ -n "$CURRENT_CODEX" ]; then
  echo "  rm -rf codex && mv codex.backup-$CURRENT_CODEX codex"
fi
