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
VERSION="v5"
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
cp "$SCRIPT_DIR/commands/architect.md" "$TARGET_DIR/.claude/commands/architect.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/document.md" "$TARGET_DIR/.claude/commands/document.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/implement.md" "$TARGET_DIR/.claude/commands/implement.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/review.md" "$TARGET_DIR/.claude/commands/review.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/security-gate.md" "$TARGET_DIR/.claude/commands/security-gate.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/session-note.md" "$TARGET_DIR/.claude/commands/session-note.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/specify.md" "$TARGET_DIR/.claude/commands/specify.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/status.md" "$TARGET_DIR/.claude/commands/status.md" 2>/dev/null || true
cp "$SCRIPT_DIR/commands/test-design.md" "$TARGET_DIR/.claude/commands/test-design.md" 2>/dev/null || true

# --- Copy skills ---
echo "[4/7] Copying skills..."
if [ -d "$SCRIPT_DIR/skills" ]; then
  cp -r "$SCRIPT_DIR"/skills/* "$TARGET_DIR/.claude/skills/" 2>/dev/null || true
  echo "  Copied skills directory"
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

# --- Copy hooks and config ---
echo "[5/7] Copying hooks and configuration..."
cp "$SCRIPT_DIR/hooks/checkpoint.js" "$TARGET_DIR/.claude/helpers/checkpoint.js"
cp "$SCRIPT_DIR/hooks/archive-context.js" "$TARGET_DIR/.claude/helpers/archive-context.js"
cp "$SCRIPT_DIR/hooks/restore-context.js" "$TARGET_DIR/.claude/helpers/restore-context.js"
cp "$SCRIPT_DIR/hooks/resolve-feature.js" "$TARGET_DIR/.claude/helpers/resolve-feature.js"
cp "$SCRIPT_DIR/hooks/settings.json" "$TARGET_DIR/.claude/settings.json"

# Copy schemas
cp -r "$SCRIPT_DIR/schemas/"* "$TARGET_DIR/.claude/schemas/" 2>/dev/null || true
echo "  Copied hooks, settings, and schemas"

echo "  Created docs directories (features, decisions) for project use"

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
echo "=== Done ==="
echo "Installed components:"
cat "$VERSION_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md to fill in project-specific sections"
echo "  2. Run a feature through the pipeline to capture baseline metrics"
echo "  3. Check token usage with: cat .claude/token-usage.jsonl"
