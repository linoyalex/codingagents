#!/usr/bin/env bash
# Migration: v4.1 → v5
#
# Called by upgrade.sh. Receives $1=SCRIPT_DIR, $2=TARGET_DIR.
# Handles v4.1-specific migration steps.

SCRIPT_DIR="$1"
TARGET_DIR="$2"

echo "  [migration] v4.1 → v5"

# Create directories that didn't exist in v4.1
mkdir -p "$TARGET_DIR/.claude/schemas"
mkdir -p "$TARGET_DIR/.claude/context-archive"

# v4.1 had no handoff schema — this is new
echo "  [migration] Added schemas directory"

# v4.1 hooks didn't have token tracking — the new hooks handle this
echo "  [migration] Hooks will be replaced with token-tracking versions"

# v4.1 didn't have .codingagents-version — already handled by upgrade.sh
echo "  [migration] Version tracking will be added"

echo "  [migration] v4.1 → v5 migration steps complete"
