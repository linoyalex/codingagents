#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

FAIL_COUNT=0

record_failure() {
  echo "FAIL: $*" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

record_success() {
  echo "PASS: $*"
}

assert_contains() {
  local path="$1"
  local pattern="$2"
  local label="$3"

  if grep -qF "$pattern" "$path"; then
    record_success "$label"
  else
    record_failure "$label"
  fi
}

assert_contains_ci() {
  local path="$1"
  local pattern="$2"
  local label="$3"

  if grep -qi "$pattern" "$path"; then
    record_success "$label"
  else
    record_failure "$label"
  fi
}

assert_count_at_least() {
  local path="$1"
  local pattern="$2"
  local minimum="$3"
  local label="$4"
  local count

  count="$(grep -oF "$pattern" "$path" | wc -l | tr -d ' ')"
  if [ "$count" -ge "$minimum" ]; then
    record_success "$label"
  else
    record_failure "$label (found $count, expected at least $minimum)"
  fi
}

PIPELINE_COMMANDS=(
  "specify"
  "architect"
  "test-design"
  "security-gate"
  "implement"
  "review"
  "document"
)

for command_name in "${PIPELINE_COMMANDS[@]}"; do
  command_path="commands/${command_name}.md"
  assert_contains_ci "$command_path" "handoff.json" "${command_name} mentions handoff.json"
  assert_contains_ci "$command_path" "fresh session" "${command_name} mentions fresh session"
  assert_contains "$command_path" "claude-" "${command_name} mentions expected model family"
done

assert_contains "commands/status.md" ".claude/pipeline-checkpoint.json" "status references .claude/pipeline-checkpoint.json"
assert_count_at_least "commands/specify.md" "docs/features/<feature-slug>/prd.md" "2" "specify uses <feature-slug> consistently for prd path"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "Command contract test failures: $FAIL_COUNT" >&2
  exit 1
fi

echo "All command contract checks passed"
