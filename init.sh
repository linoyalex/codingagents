#!/usr/bin/env bash
# init.sh — Set up a target project with codingagents pipeline
#
# Usage:
#   bash /path/to/codingagents/init.sh           # Core pipeline only
#   bash /path/to/codingagents/init.sh --codex    # Core pipeline + Codex review layer
#
# Run from the root of the target project.
# Idempotent: safe to run multiple times. Overwrites framework files,
# prompts before overwriting project-specific files (CLAUDE.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$(pwd)"
WITH_CODEX=false
VERSION="v5"

for arg in "$@"; do
  case "$arg" in
    --codex) WITH_CODEX=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "=== codingagents init ==="
echo "Source:  $SCRIPT_DIR"
echo "Target:  $TARGET_DIR"
echo "Version: $VERSION"
echo "Codex:   $WITH_CODEX"
echo ""

# --- Create directory structure ---
echo "[1/7] Creating directory structure..."
mkdir -p "$TARGET_DIR/.claude/agents"
mkdir -p "$TARGET_DIR/.claude/commands"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.claude/helpers"
mkdir -p "$TARGET_DIR/.claude/schemas"
mkdir -p "$TARGET_DIR/.claude/context-archive"
mkdir -p "$TARGET_DIR/docs/architecture"
mkdir -p "$TARGET_DIR/docs/design"
mkdir -p "$TARGET_DIR/docs/memory"
mkdir -p "$TARGET_DIR/docs/security"
mkdir -p "$TARGET_DIR/docs/reviews"

# --- Copy roles ---
echo "[2/7] Copying role files..."
for role in "$SCRIPT_DIR"/ROLE_*.md; do
  cp "$role" "$TARGET_DIR/.claude/agents/$(basename "$role")"
done
echo "  Copied $(ls "$SCRIPT_DIR"/ROLE_*.md 2>/dev/null | wc -l | tr -d ' ') role files"

# --- Copy commands ---
echo "[3/7] Copying commands..."
if [ -d "$SCRIPT_DIR/commands" ]; then
  cp "$SCRIPT_DIR"/commands/*.md "$TARGET_DIR/.claude/commands/" 2>/dev/null || true
  echo "  Copied $(ls "$SCRIPT_DIR"/commands/*.md 2>/dev/null | wc -l | tr -d ' ') command files"
fi

# --- Copy skills ---
echo "[4/7] Copying skills..."
if [ -d "$SCRIPT_DIR/skills" ]; then
  cp -r "$SCRIPT_DIR"/skills/* "$TARGET_DIR/.claude/skills/" 2>/dev/null || true
  echo "  Copied skills directory"
fi

# --- Copy hooks and config ---
echo "[5/7] Copying hooks and configuration..."
cp "$SCRIPT_DIR/hooks/checkpoint.js" "$TARGET_DIR/.claude/helpers/checkpoint.js"
cp "$SCRIPT_DIR/hooks/archive-context.js" "$TARGET_DIR/.claude/helpers/archive-context.js"
cp "$SCRIPT_DIR/hooks/restore-context.js" "$TARGET_DIR/.claude/helpers/restore-context.js"
cp "$SCRIPT_DIR/hooks/settings.json" "$TARGET_DIR/.claude/settings.json"

# Copy schemas
cp -r "$SCRIPT_DIR/schemas/"* "$TARGET_DIR/.claude/schemas/" 2>/dev/null || true
echo "  Copied hooks, settings, and schemas"

# Copy shared memory and design docs used by fresh sessions
if [ -d "$SCRIPT_DIR/docs/design" ]; then
  cp "$SCRIPT_DIR"/docs/design/*.md "$TARGET_DIR/docs/design/" 2>/dev/null || true
fi
if [ -d "$SCRIPT_DIR/docs/memory" ]; then
  cp "$SCRIPT_DIR"/docs/memory/*.md "$TARGET_DIR/docs/memory/" 2>/dev/null || true
fi
echo "  Copied shared design and memory docs"

# --- CLAUDE.md (prompt before overwrite) ---
echo "[6/7] Setting up CLAUDE.md..."
if [ -f "$TARGET_DIR/CLAUDE.md" ]; then
  echo "  CLAUDE.md already exists."
  read -p "  Overwrite with template? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
    echo "  Overwritten."
  else
    echo "  Kept existing. Review codingagents/CLAUDE.md for new sections (Phase Handoff Protocol, Memory Governance)."
  fi
else
  cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  echo "  Copied CLAUDE.md template."
fi

# --- .gitignore update ---
echo "[7/7] Updating .gitignore..."
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
echo "  Updated .gitignore with runtime artifact patterns"

# --- Version file ---
echo "$VERSION" > "$TARGET_DIR/.claude/.codingagents-version"

# --- Codex (optional) ---
if [ "$WITH_CODEX" = true ]; then
  echo ""
  echo "[codex] Copying Codex review layer..."
  mkdir -p "$TARGET_DIR/codex/reviewers"
  mkdir -p "$TARGET_DIR/codex/templates"
  mkdir -p "$TARGET_DIR/codex/reviews"

  # Copy reviewers if they exist
  if [ -d "$SCRIPT_DIR/codex/reviewers" ]; then
    cp "$SCRIPT_DIR"/codex/reviewers/*.md "$TARGET_DIR/codex/reviewers/" 2>/dev/null || true
  fi

  # Copy templates if they exist
  if [ -d "$SCRIPT_DIR/codex/templates" ]; then
    cp "$SCRIPT_DIR"/codex/templates/* "$TARGET_DIR/codex/templates/" 2>/dev/null || true
  fi

  # Copy scripts if they exist
  for script in log-usage.sh report-usage.sh; do
    if [ -f "$SCRIPT_DIR/codex/$script" ]; then
      cp "$SCRIPT_DIR/codex/$script" "$TARGET_DIR/codex/$script"
      chmod +x "$TARGET_DIR/codex/$script"
    fi
  done

  # Copy docs
  for doc in README.md fresh-context-playbook.md; do
    if [ -f "$SCRIPT_DIR/codex/$doc" ]; then
      cp "$SCRIPT_DIR/codex/$doc" "$TARGET_DIR/codex/$doc"
    fi
  done

  # Add codex runtime artifacts to .gitignore
  if ! grep -qF "codex/reviews/" "$TARGET_DIR/.gitignore" 2>/dev/null; then
    echo "codex/reviews/" >> "$TARGET_DIR/.gitignore"
  fi

  echo "  Codex review layer installed."
fi

echo ""
echo "=== Done ==="
echo "Version $VERSION installed to $TARGET_DIR"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md to fill in project-specific sections"
echo "  2. Run a feature through the pipeline to capture baseline metrics"
echo "  3. Check token usage with: cat .claude/token-usage.jsonl"
