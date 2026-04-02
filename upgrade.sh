#!/usr/bin/env bash
# upgrade.sh — Upgrade an existing project to the latest codingagents version
#
# Usage:
#   bash /path/to/codingagents/upgrade.sh           # Upgrade pipeline only
#   bash /path/to/codingagents/upgrade.sh --codex    # Upgrade pipeline + Codex review layer
#
# Run from the root of the target project.
# Creates a backup before making changes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$(pwd)"
WITH_CODEX=false
NEW_VERSION="v5"

for arg in "$@"; do
  case "$arg" in
    --codex) WITH_CODEX=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# --- Detect current version ---
VERSION_FILE="$TARGET_DIR/.claude/.codingagents-version"
if [ -f "$VERSION_FILE" ]; then
  CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
else
  CURRENT_VERSION="v4.1"
  echo "No .codingagents-version found. Assuming $CURRENT_VERSION."
fi

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
  echo "Already at version $NEW_VERSION. Nothing to upgrade."
  exit 0
fi

echo "=== codingagents upgrade ==="
echo "Source:   $SCRIPT_DIR"
echo "Target:   $TARGET_DIR"
echo "Current:  $CURRENT_VERSION"
echo "Upgrade:  $NEW_VERSION"
echo "Codex:    $WITH_CODEX"
echo ""

# --- Show what will change ---
echo "This upgrade will:"
echo "  - Back up .claude/ to .claude.backup-$CURRENT_VERSION/"
if [ "$WITH_CODEX" = true ] && [ -d "$TARGET_DIR/codex" ]; then
  echo "  - Back up codex/ to codex.backup-$CURRENT_VERSION/"
fi
echo "  - Back up docs/design/ and docs/memory/ to docs.backup-$CURRENT_VERSION/ (if they exist)"
echo "  - Replace hook files (checkpoint.js, restore-context.js, archive-context.js)"
echo "  - Replace role files in .claude/agents/"
echo "  - Replace skill files in .claude/skills/"
echo "  - Add schemas/ directory"
echo "  - Replace shared docs in docs/design/ and docs/memory/"
echo "  - Update .gitignore with new runtime artifact patterns"
echo "  - Write version $NEW_VERSION"
echo ""
echo "  Will NOT touch: CLAUDE.md, project docs outside docs/design and docs/memory, src/, runtime artifacts"
echo ""

read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# --- Backup ---
echo ""
echo "[1/6] Creating backup..."
BACKUP_DIR="$TARGET_DIR/.claude.backup-$CURRENT_VERSION"
if [ -d "$BACKUP_DIR" ]; then
  echo "  Backup already exists at $BACKUP_DIR — skipping backup."
else
  cp -r "$TARGET_DIR/.claude" "$BACKUP_DIR"
  echo "  Backed up .claude/ to $BACKUP_DIR"
fi

if [ "$WITH_CODEX" = true ] && [ -d "$TARGET_DIR/codex" ]; then
  CODEX_BACKUP="$TARGET_DIR/codex.backup-$CURRENT_VERSION"
  if [ -d "$CODEX_BACKUP" ]; then
    echo "  Codex backup already exists — skipping."
  else
    cp -r "$TARGET_DIR/codex" "$CODEX_BACKUP"
    echo "  Backed up codex/ to $CODEX_BACKUP"
  fi
fi

# Back up docs/design and docs/memory if they exist (may have local edits)
DOCS_BACKUP="$TARGET_DIR/docs.backup-$CURRENT_VERSION"
if [ -d "$TARGET_DIR/docs/design" ] || [ -d "$TARGET_DIR/docs/memory" ]; then
  if [ -d "$DOCS_BACKUP" ]; then
    echo "  Docs backup already exists — skipping."
  else
    mkdir -p "$DOCS_BACKUP"
    [ -d "$TARGET_DIR/docs/design" ] && cp -r "$TARGET_DIR/docs/design" "$DOCS_BACKUP/design"
    [ -d "$TARGET_DIR/docs/memory" ] && cp -r "$TARGET_DIR/docs/memory" "$DOCS_BACKUP/memory"
    echo "  Backed up docs/design/ and docs/memory/ to $DOCS_BACKUP"
  fi
fi

# --- Run version-specific migration ---
echo "[2/6] Running migration..."
MIGRATION_SCRIPT="$SCRIPT_DIR/migrations/${CURRENT_VERSION}-to-${NEW_VERSION}.sh"
if [ -f "$MIGRATION_SCRIPT" ]; then
  echo "  Running $MIGRATION_SCRIPT"
  bash "$MIGRATION_SCRIPT" "$SCRIPT_DIR" "$TARGET_DIR"
else
  echo "  No migration script found for $CURRENT_VERSION → $NEW_VERSION."
  echo "  Performing generic upgrade (replace framework files)."
fi

# --- Replace framework files ---
echo "[3/6] Updating hooks..."
cp "$SCRIPT_DIR/hooks/checkpoint.js" "$TARGET_DIR/.claude/helpers/checkpoint.js"
cp "$SCRIPT_DIR/hooks/archive-context.js" "$TARGET_DIR/.claude/helpers/archive-context.js"
cp "$SCRIPT_DIR/hooks/restore-context.js" "$TARGET_DIR/.claude/helpers/restore-context.js"
cp "$SCRIPT_DIR/hooks/settings.json" "$TARGET_DIR/.claude/settings.json"

echo "[4/6] Updating roles, skills, and schemas..."
# Roles
for role in "$SCRIPT_DIR"/ROLE_*.md; do
  cp "$role" "$TARGET_DIR/.claude/agents/$(basename "$role")"
done

# Skills
if [ -d "$SCRIPT_DIR/skills" ]; then
  mkdir -p "$TARGET_DIR/.claude/skills"
  cp -r "$SCRIPT_DIR"/skills/* "$TARGET_DIR/.claude/skills/" 2>/dev/null || true
fi

# Schemas
mkdir -p "$TARGET_DIR/.claude/schemas"
cp -r "$SCRIPT_DIR/schemas/"* "$TARGET_DIR/.claude/schemas/" 2>/dev/null || true

# Commands
if [ -d "$SCRIPT_DIR/commands" ]; then
  mkdir -p "$TARGET_DIR/.claude/commands"
  cp "$SCRIPT_DIR"/commands/*.md "$TARGET_DIR/.claude/commands/" 2>/dev/null || true
fi

# Shared design and memory docs
mkdir -p "$TARGET_DIR/docs/design"
mkdir -p "$TARGET_DIR/docs/memory"
if [ -d "$SCRIPT_DIR/docs/design" ]; then
  cp "$SCRIPT_DIR"/docs/design/*.md "$TARGET_DIR/docs/design/" 2>/dev/null || true
fi
if [ -d "$SCRIPT_DIR/docs/memory" ]; then
  cp "$SCRIPT_DIR"/docs/memory/*.md "$TARGET_DIR/docs/memory/" 2>/dev/null || true
fi

# --- .gitignore update ---
echo "[5/6] Updating .gitignore..."
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

# --- Version file ---
echo "[6/6] Writing version..."
echo "$NEW_VERSION" > "$TARGET_DIR/.claude/.codingagents-version"

# --- Codex (optional) ---
if [ "$WITH_CODEX" = true ]; then
  echo ""
  echo "[codex] Updating Codex review layer..."
  mkdir -p "$TARGET_DIR/codex/reviewers"
  mkdir -p "$TARGET_DIR/codex/templates"
  mkdir -p "$TARGET_DIR/codex/reviews"

  if [ -d "$SCRIPT_DIR/codex/reviewers" ]; then
    cp "$SCRIPT_DIR"/codex/reviewers/*.md "$TARGET_DIR/codex/reviewers/" 2>/dev/null || true
  fi

  if [ -d "$SCRIPT_DIR/codex/templates" ]; then
    cp "$SCRIPT_DIR"/codex/templates/* "$TARGET_DIR/codex/templates/" 2>/dev/null || true
  fi

  for script in log-usage.sh report-usage.sh; do
    if [ -f "$SCRIPT_DIR/codex/$script" ]; then
      cp "$SCRIPT_DIR/codex/$script" "$TARGET_DIR/codex/$script"
      chmod +x "$TARGET_DIR/codex/$script"
    fi
  done

  for doc in README.md fresh-context-playbook.md; do
    if [ -f "$SCRIPT_DIR/codex/$doc" ]; then
      cp "$SCRIPT_DIR/codex/$doc" "$TARGET_DIR/codex/$doc"
    fi
  done

  if ! grep -qF "codex/reviews/" "$TARGET_DIR/.gitignore" 2>/dev/null; then
    echo "codex/reviews/" >> "$TARGET_DIR/.gitignore"
  fi

  echo "  Codex review layer updated."
fi

echo ""
echo "=== Upgrade complete: $CURRENT_VERSION → $NEW_VERSION ==="
echo ""
echo "IMPORTANT: Review CLAUDE.md manually for new sections:"
echo "  - Phase Handoff Protocol"
echo "  - Memory & Instruction Governance"
echo "See $SCRIPT_DIR/CLAUDE.md for the template."
echo ""
echo "To rollback:"
echo "  rm -rf .claude && mv .claude.backup-$CURRENT_VERSION .claude"
if [ "$WITH_CODEX" = true ]; then
  echo "  rm -rf codex && mv codex.backup-$CURRENT_VERSION codex"
fi
echo "  rm -rf docs/design docs/memory && cp -r docs.backup-$CURRENT_VERSION/* docs/"
