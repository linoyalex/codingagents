#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/codingagents-install-tests.XXXXXX")"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

PASS_COUNT=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS: $*"
}

assert_file_exists() {
  local path="$1"
  [ -f "$path" ] || fail "Expected file to exist: $path"
}

assert_dir_exists() {
  local path="$1"
  [ -d "$path" ] || fail "Expected directory to exist: $path"
}

assert_not_exists() {
  local path="$1"
  [ ! -e "$path" ] || fail "Expected path to be absent: $path"
}

assert_contains() {
  local path="$1"
  local text="$2"
  grep -qF "$text" "$path" || fail "Expected '$text' in $path"
}

assert_not_contains() {
  local path="$1"
  local text="$2"
  if grep -qF "$text" "$path"; then
    fail "Did not expect '$text' in $path"
  fi
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  local label="${3:-values}"
  [ "$actual" = "$expected" ] || fail "Expected $label to be '$expected', got '$actual'"
}

line_count() {
  local path="$1"
  local text="$2"
  awk -v needle="$text" 'index($0, needle) > 0 { count++ } END { print count + 0 }' "$path"
}

run_init() {
  local target="$1"
  shift
  (
    cd "$target"
    bash "$ROOT_DIR/init.sh" "$@"
  )
}

run_upgrade() {
  local target="$1"
  shift
  (
    cd "$target"
    printf 'y\n' | bash "$ROOT_DIR/upgrade.sh" "$@"
  )
}

test_init_core_install() {
  local target="$TMP_ROOT/init-core"
  mkdir -p "$target"

  run_init "$target"

  assert_dir_exists "$target/.claude/agents"
  assert_dir_exists "$target/.claude/commands"
  assert_dir_exists "$target/.claude/skills"
  assert_dir_exists "$target/.claude/helpers"
  assert_dir_exists "$target/.claude/schemas"
  assert_dir_exists "$target/.claude/context-archive"
  assert_dir_exists "$target/docs/features"
  assert_dir_exists "$target/docs/decisions"

  assert_file_exists "$target/.claude/helpers/checkpoint.js"
  assert_file_exists "$target/.claude/helpers/archive-context.js"
  assert_file_exists "$target/.claude/helpers/restore-context.js"
  assert_file_exists "$target/.claude/settings.json"
  assert_file_exists "$target/.claude/schemas/handoff.schema.json"
  assert_file_exists "$target/CLAUDE.md"
  assert_file_exists "$target/.gitignore"
  assert_file_exists "$target/.claude/.codingagents-version"

  assert_not_exists "$target/docs/design"
  assert_not_exists "$target/docs/memory"
  assert_not_exists "$target/codex"

  assert_contains "$target/.gitignore" ".claude/session-note.md"
  assert_contains "$target/.gitignore" ".claude/handoff.json"
  assert_contains "$target/.gitignore" "codex/reviews/"
  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_not_contains "$target/.claude/.codingagents-version" "codex="

  pass "init installs core pipeline only"
}

test_init_with_codex() {
  local target="$TMP_ROOT/init-codex"
  mkdir -p "$target"

  run_init "$target" --codex

  assert_dir_exists "$target/codex/reviewers"
  assert_dir_exists "$target/codex/templates"
  assert_dir_exists "$target/codex/reviews"
  assert_file_exists "$target/codex/README.md"
  assert_file_exists "$target/codex/fresh-context-playbook.md"
  assert_file_exists "$target/codex/log-usage.sh"
  assert_file_exists "$target/codex/report-usage.sh"
  assert_file_exists "$target/codex/reviewers/review-code.md"
  assert_file_exists "$target/codex/reviewers/review-prd.md"
  assert_file_exists "$target/codex/reviewers/review-architecture.md"
  assert_file_exists "$target/codex/reviewers/review-test-design.md"
  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_contains "$target/.claude/.codingagents-version" "codex=v5"
  [ -x "$target/codex/log-usage.sh" ] || fail "Expected codex/log-usage.sh to be executable"
  [ -x "$target/codex/report-usage.sh" ] || fail "Expected codex/report-usage.sh to be executable"

  pass "init installs optional codex layer"
}

test_init_rerun_preserves_claude_and_avoids_duplicate_gitignore() {
  local target="$TMP_ROOT/init-rerun"
  mkdir -p "$target"

  run_init "$target"
  printf 'custom claude\n' > "$target/CLAUDE.md"

  (
    cd "$target"
    printf 'n\n' | bash "$ROOT_DIR/init.sh"
  )

  assert_contains "$target/CLAUDE.md" "custom claude"

  local handoff_count
  handoff_count="$(line_count "$target/.gitignore" ".claude/handoff.json")"
  assert_equals "$handoff_count" "1" ".gitignore handoff entry count"

  local session_note_count
  session_note_count="$(line_count "$target/.gitignore" ".claude/session-note.md")"
  assert_equals "$session_note_count" "1" ".gitignore session-note entry count"

  local core_count
  core_count="$(line_count "$target/.claude/.codingagents-version" "core=v5")"
  assert_equals "$core_count" "1" "core version entry count"

  pass "init rerun keeps existing CLAUDE.md and avoids duplicate metadata"
}

test_upgrade_from_legacy_core() {
  local target="$TMP_ROOT/upgrade-legacy"
  mkdir -p "$target/.claude/agents" "$target/.claude/helpers" "$target/.claude/skills"
  printf 'legacy core\n' > "$target/CLAUDE.md"
  printf 'v4.1\n' > "$target/.claude/.codingagents-version"
  printf 'legacy helper\n' > "$target/.claude/helpers/checkpoint.js"
  printf 'legacy role\n' > "$target/.claude/agents/ROLE_DEVELOPER.md"
  printf 'legacy skill\n' > "$target/.claude/skills/legacy.txt"

  run_upgrade "$target"

  assert_dir_exists "$target/.claude.backup-v4.1"
  assert_file_exists "$target/.claude.backup-v4.1/.codingagents-version"
  assert_dir_exists "$target/docs/features"
  assert_dir_exists "$target/docs/decisions"
  assert_file_exists "$target/.claude/helpers/checkpoint.js"
  assert_file_exists "$target/.claude/helpers/archive-context.js"
  assert_file_exists "$target/.claude/helpers/restore-context.js"
  assert_file_exists "$target/.claude/schemas/handoff.schema.json"
  assert_file_exists "$target/.claude/commands/specify.md"
  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_not_contains "$target/.claude/.codingagents-version" "codex="
  assert_contains "$target/CLAUDE.md" "legacy core"
  assert_not_exists "$target/docs/design"
  assert_not_exists "$target/docs/memory"

  pass "upgrade migrates legacy core install without copying repo-specific docs"
}

test_upgrade_installs_codex_without_replacing_current_core() {
  local target="$TMP_ROOT/upgrade-codex-only"
  mkdir -p "$target/.claude"
  printf 'keep me\n' > "$target/CLAUDE.md"
  cat > "$target/.claude/.codingagents-version" <<'EOF'
core=v5
EOF

  run_upgrade "$target" --codex

  assert_not_exists "$target/.claude.backup-v5"
  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_contains "$target/.claude/.codingagents-version" "codex=v5"
  assert_dir_exists "$target/codex/reviewers"
  assert_file_exists "$target/codex/log-usage.sh"
  assert_file_exists "$target/codex/report-usage.sh"
  assert_contains "$target/CLAUDE.md" "keep me"

  pass "upgrade can install codex independently when core is already current"
}

test_upgrade_legacy_single_line_version_migration() {
  local target="$TMP_ROOT/upgrade-legacy-single-line"
  mkdir -p "$target/.claude/agents" "$target/.claude/helpers"
  printf 'v5\n' > "$target/.claude/.codingagents-version"
  printf 'existing\n' > "$target/.claude/helpers/checkpoint.js"

  # Should migrate "v5" to "core=v5" and detect nothing to upgrade
  local output
  output="$(cd "$target" && bash "$ROOT_DIR/upgrade.sh" 2>&1)" || true

  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  # Every line in the version file should contain '='
  local raw_lines
  raw_lines=$(grep -cv "=" "$target/.claude/.codingagents-version" || true)
  raw_lines=$(echo "$raw_lines" | tr -d '[:space:]')
  assert_equals "$raw_lines" "0" "lines without = sign in version file"

  pass "upgrade migrates legacy single-line version file to key=value format"
}

test_upgrade_codex_already_installed_nothing_to_do() {
  local target="$TMP_ROOT/upgrade-codex-noop"
  mkdir -p "$target/.claude" "$target/codex/reviewers"
  cat > "$target/.claude/.codingagents-version" <<'EOF'
core=v5
codex=v5
EOF

  local output
  output="$(cd "$target" && bash "$ROOT_DIR/upgrade.sh" --codex 2>&1)" || true

  echo "$output" | grep -qF "Nothing to upgrade" || fail "Expected 'Nothing to upgrade' message"
  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_contains "$target/.claude/.codingagents-version" "codex=v5"

  pass "upgrade detects codex already at current version and skips"
}

test_upgrade_codex_version_set_but_dir_missing_reinstalls() {
  local target="$TMP_ROOT/upgrade-codex-reinstall"
  mkdir -p "$target/.claude"
  cat > "$target/.claude/.codingagents-version" <<'EOF'
core=v5
codex=v5
EOF
  # Deliberately do NOT create codex/reviewers — simulates missing files

  run_upgrade "$target" --codex

  assert_dir_exists "$target/codex/reviewers"
  assert_file_exists "$target/codex/reviewers/review-code.md"
  assert_file_exists "$target/codex/log-usage.sh"
  assert_contains "$target/.claude/.codingagents-version" "codex=v5"

  pass "upgrade reinstalls codex when version file is set but directory is missing"
}

test_verbose_flag_produces_trace_output() {
  local target="$TMP_ROOT/init-verbose"
  mkdir -p "$target"

  local output
  output="$(cd "$target" && bash "$ROOT_DIR/init.sh" --verbose 2>&1)"

  echo "$output" | grep -qF "[verbose]" || fail "Expected [verbose] log lines in output"
  echo "$output" | grep -qF "VERSION_FILE=" || fail "Expected VERSION_FILE verbose log"
  echo "$output" | grep -qF "core=v5" || fail "Expected core version in output"

  pass "--verbose flag produces trace output"
}

test_unknown_flag_rejected() {
  local target="$TMP_ROOT/init-bad-flag"
  mkdir -p "$target"

  local exit_code=0
  (cd "$target" && bash "$ROOT_DIR/init.sh" --nonexistent 2>&1) || exit_code=$?

  [ "$exit_code" -ne 0 ] || fail "Expected non-zero exit code for unknown flag"

  exit_code=0
  (cd "$target" && printf 'y\n' | bash "$ROOT_DIR/upgrade.sh" --nonexistent 2>&1) || exit_code=$?

  [ "$exit_code" -ne 0 ] || fail "Expected non-zero exit code for unknown flag in upgrade.sh"

  pass "unknown flags are rejected with non-zero exit"
}

test_upgrade_core_and_codex_simultaneously() {
  local target="$TMP_ROOT/upgrade-both"
  mkdir -p "$target/.claude/agents" "$target/.claude/helpers" "$target/.claude/skills"
  printf 'v4.1\n' > "$target/.claude/.codingagents-version"
  printf 'legacy\n' > "$target/.claude/helpers/checkpoint.js"
  printf 'keep me\n' > "$target/CLAUDE.md"

  run_upgrade "$target" --codex

  assert_contains "$target/.claude/.codingagents-version" "core=v5"
  assert_contains "$target/.claude/.codingagents-version" "codex=v5"
  assert_dir_exists "$target/.claude.backup-v4.1"
  assert_dir_exists "$target/codex/reviewers"
  assert_file_exists "$target/codex/reviewers/review-code.md"
  assert_file_exists "$target/.claude/helpers/checkpoint.js"
  assert_file_exists "$target/.claude/schemas/handoff.schema.json"
  assert_contains "$target/CLAUDE.md" "keep me"

  pass "upgrade handles core + codex simultaneously from legacy version"
}

main() {
  test_init_core_install
  test_init_with_codex
  test_init_rerun_preserves_claude_and_avoids_duplicate_gitignore
  test_upgrade_from_legacy_core
  test_upgrade_installs_codex_without_replacing_current_core
  test_upgrade_legacy_single_line_version_migration
  test_upgrade_codex_already_installed_nothing_to_do
  test_upgrade_codex_version_set_but_dir_missing_reinstalls
  test_verbose_flag_produces_trace_output
  test_unknown_flag_rejected
  test_upgrade_core_and_codex_simultaneously
  echo "All tests passed ($PASS_COUNT)"
}

main "$@"
