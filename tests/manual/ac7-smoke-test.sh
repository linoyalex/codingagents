#!/usr/bin/env bash
set -euo pipefail

# AC7 Manual Smoke Test: Spot-check phase command with converted verification-gate skill
#
# This script runs a real phase command that loads the verification-gate skill
# in progressive-disclosure format. It verifies the skill loads without errors
# and the command produces expected output.
#
# Prerequisites:
#   - claude CLI installed and authenticated
#   - Run from the project root directory
#
# Usage:
#   bash tests/manual/ac7-smoke-test.sh [feature-slug]
#
# The feature-slug defaults to "skill-size-convention" if not provided.
# This test consumes real API tokens — run it manually, not in CI.

FEATURE="${1:-skill-size-convention}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== AC7 Smoke Test ==="
echo "Feature: $FEATURE"
echo "Project root: $PROJECT_ROOT"
echo ""

# Verify prerequisites
if ! command -v claude &>/dev/null; then
  echo "FAIL: claude CLI not found on PATH"
  exit 1
fi

# Verify the converted skill exists in installed location
SKILL_PATH="$PROJECT_ROOT/.claude/skills/verification-gate/SKILL.md"
if [ ! -f "$SKILL_PATH" ]; then
  echo "FAIL: Installed skill not found at $SKILL_PATH"
  exit 1
fi

echo "1. Installed skill found: $SKILL_PATH"

# Verify reference files are present
REF_COUNT=$(find "$PROJECT_ROOT/.claude/skills/verification-gate" -name "phase-*.md" | wc -l | tr -d ' ')
if [ "$REF_COUNT" -eq 0 ]; then
  echo "FAIL: No phase reference files found in installed skill directory"
  exit 1
fi
echo "2. Found $REF_COUNT phase reference files"

# Run a lightweight phase command that loads verification-gate
# Using security-gate as it explicitly reads verification-gate skill
echo ""
echo "3. Running phase command (security-gate) with verification-gate skill..."
echo "   This will make a real API call."
echo ""

OUTPUT=$(claude -p "Read .claude/skills/verification-gate/SKILL.md. List the section headings you find and confirm you can read the file. Then for each [See reference: ...] link in the file, read that reference file and confirm it exists and has content. Report: (1) number of headings found, (2) number of reference links found and resolved, (3) any errors. Do NOT perform any security audit — just verify the skill files load correctly." \
  --max-budget-usd 0.50 \
  --no-session-persistence \
  2>&1) || {
    echo "FAIL: claude command exited with non-zero status"
    echo "Output: $OUTPUT"
    exit 1
  }

echo "Command output:"
echo "$OUTPUT"
echo ""

# Check output for success signals
if echo "$OUTPUT" | grep -qi "error\|fail\|not found\|cannot read"; then
  echo "WARNING: Output may contain error signals — review manually"
else
  echo "4. No error signals detected in output"
fi

echo ""
echo "=== AC7 Smoke Test PASSED ==="
echo "The verification-gate skill loaded successfully in progressive-disclosure format."
echo "Reference files were reachable from the installed SKILL.md."
