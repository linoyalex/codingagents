#!/usr/bin/env bash
# init.sh — Set up a target project with codingagents pipeline
#
# Usage:
#   bash /path/to/codingagents/init.sh                    # Core pipeline only
#   bash /path/to/codingagents/init.sh --codex             # Core pipeline + Codex review layer
#   bash /path/to/codingagents/init.sh --codex --verbose   # With full trace output
#
# Run from the root of the target project.
# Idempotent: safe to run multiple times. Overwrites framework files,
# prompts before overwriting project-specific files (CLAUDE.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$(pwd)"
WITH_CODEX=false
VERBOSE=false
SYNC_CLAUDE_MD=false
VERSION="v5"
VERSION_FILE="$TARGET_DIR/.claude/.codingagents-version"
CLAUDE_MD_STATUS=""

for arg in "$@"; do
  case "$arg" in
    --codex) WITH_CODEX=true ;;
    --verbose) VERBOSE=true ;;
    --sync-claude-md) SYNC_CLAUDE_MD=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# Source sync library for --sync-claude-md support
if [ "$SYNC_CLAUDE_MD" = true ]; then
  source "$SCRIPT_DIR/lib/sync-claude-md.sh"
fi

# Early interactive capture: when existing CLAUDE.md + no --sync-claude-md + terminal,
# prompt the user immediately (before file operations) so PTY input is captured
# before any pipe EOF is processed. Exit immediately if user declines overwrite
# to avoid a partial install.
CLAUDE_MD_CHOICE=""
if [ "$SYNC_CLAUDE_MD" = false ] && [ -f "$TARGET_DIR/CLAUDE.md" ] && [ -t 0 ]; then
  read -p "  CLAUDE.md exists — (o)verwrite with template / (e)xit to re-run with --sync-claude-md: " -n 1 -r || true
  CLAUDE_MD_CHOICE="$REPLY"
  echo
  case "$CLAUDE_MD_CHOICE" in
    o|O) ;; # continue with install
    *)
      echo "  Re-run with --sync-claude-md for section-level sync"
      exit 0
      ;;
  esac
fi

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

# Migrate legacy single-line version file
if [ -f "$VERSION_FILE" ] && ! grep -q "=" "$VERSION_FILE" 2>/dev/null; then
  LEGACY_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
  echo "core=$LEGACY_VERSION" > "$VERSION_FILE"
  echo "Migrated legacy version file (was: $LEGACY_VERSION)"
fi

echo "=== codingagents init ==="
echo "Source:  $SCRIPT_DIR"
echo "Target:  $TARGET_DIR"
echo "Version: $VERSION"
echo "Codex:   $WITH_CODEX"
echo "Verbose: $VERBOSE"
log_verbose "VERSION_FILE=$VERSION_FILE"
log_verbose "Existing version file: $(cat "$VERSION_FILE" 2>/dev/null || echo 'not found')"
echo ""

# --- Create directory structure ---
echo "[1/7] Creating directory structure..."
mkdir -p "$TARGET_DIR/.claude/agents"
mkdir -p "$TARGET_DIR/.claude/commands"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.claude/helpers"
mkdir -p "$TARGET_DIR/.claude/schemas"
mkdir -p "$TARGET_DIR/.claude/context-archive"
mkdir -p "$TARGET_DIR/docs/features"
mkdir -p "$TARGET_DIR/docs/decisions"


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
cp "$SCRIPT_DIR/hooks/checkpoint.cjs" "$TARGET_DIR/.claude/helpers/checkpoint.cjs"
cp "$SCRIPT_DIR/hooks/archive-context.cjs" "$TARGET_DIR/.claude/helpers/archive-context.cjs"
cp "$SCRIPT_DIR/hooks/restore-context.cjs" "$TARGET_DIR/.claude/helpers/restore-context.cjs"
cp "$SCRIPT_DIR/hooks/resolve-feature.cjs" "$TARGET_DIR/.claude/helpers/resolve-feature.cjs"
cp "$SCRIPT_DIR/hooks/settings.json" "$TARGET_DIR/.claude/settings.json"

# Copy schemas
cp -r "$SCRIPT_DIR/schemas/"* "$TARGET_DIR/.claude/schemas/" 2>/dev/null || true
echo "  Copied hooks, settings, and schemas"

echo "  Created docs directories (features, decisions) for project use"

# --- CLAUDE.md ---
echo "[6/7] Setting up CLAUDE.md..."
if [ "$SYNC_CLAUDE_MD" = true ]; then
  # --sync-claude-md: validate source exists BEFORE modifying any files
  local_source="$SCRIPT_DIR/docs/CLAUDE.md"
  if [ ! -f "$local_source" ]; then
    echo "Error: docs/CLAUDE.md not found at $local_source" >&2
    exit 1
  fi
  if [ -f "$TARGET_DIR/CLAUDE.md" ]; then
    # Backup existing CLAUDE.md before overwriting with template
    cp "$TARGET_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md.pre-sync"
    echo "  Backup saved to CLAUDE.md.pre-sync — restore with: mv CLAUDE.md.pre-sync CLAUDE.md"
  fi
  cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  sync_claude_md "$local_source" "$TARGET_DIR/CLAUDE.md" "init"
  sync_exit=$?
  if [ "$sync_exit" -ne 0 ]; then
    exit "$sync_exit"
  fi
elif [ -f "$TARGET_DIR/CLAUDE.md" ]; then
  if [ "$CLAUDE_MD_CHOICE" = "o" ] || [ "$CLAUDE_MD_CHOICE" = "O" ]; then
    # Interactive overwrite (exit/invalid/EOF already handled at early capture)
    cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
    CLAUDE_MD_STATUS="overwritten with template"
    echo "  Overwritten with template."
  elif [ ! -t 0 ]; then
    # Non-interactive: keep existing, print reminder
    echo "  CLAUDE.md already exists — keeping existing file."
    echo "  Re-run with --sync-claude-md for section-level sync"
    CLAUDE_MD_STATUS="kept existing — run with --sync-claude-md to sync sections"
  fi
else
  cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  CLAUDE_MD_STATUS="copied template"
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

# --- Track core version ---
set_component_version "core" "$VERSION"
log_verbose "Wrote core=$VERSION to version file"

# --- Codex (optional) ---
if [ "$WITH_CODEX" = true ]; then
  echo ""
  echo "[codex] Copying Codex review layer..."
  log_verbose "Source codex dir: $SCRIPT_DIR/codex/"
  log_verbose "Source codex contents: $(ls "$SCRIPT_DIR/codex/" 2>/dev/null || echo 'MISSING')"
  log_verbose "Target codex dir: $TARGET_DIR/codex/"
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

  set_component_version "codex" "$VERSION"
  log_verbose "Wrote codex=$VERSION to version file"
  log_verbose "Codex files installed: $(ls "$TARGET_DIR/codex/" 2>/dev/null || echo 'NONE')"
  echo "  Codex review layer installed."
else
  log_verbose "WITH_CODEX=$WITH_CODEX — skipping codex install"
fi

echo ""
echo "=== codingagents init complete ==="
echo "Installed components:"
cat "$VERSION_FILE"
[ -n "$CLAUDE_MD_STATUS" ] && echo "  CLAUDE.md: $CLAUDE_MD_STATUS"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md to fill in project-specific sections"
echo "  2. Run a feature through the pipeline to capture baseline metrics"
echo "  3. Check token usage with: cat .claude/token-usage.jsonl"
