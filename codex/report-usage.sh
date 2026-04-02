#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${REPO_ROOT}/.claude/token-usage.jsonl"
FEATURE_FILTER="${1:-}"

python3 - "$REPO_ROOT" "$LOG_FILE" "$FEATURE_FILTER" <<'PY'
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

repo_root = Path(sys.argv[1])
log_file = Path(sys.argv[2])
feature_filter = sys.argv[3]

def parse_token_value(raw: str):
    raw = raw.strip().strip("*")
    if not raw:
        return None, raw
    match_range = re.search(r"~?(\d+)(?:-(\d+))?K", raw, re.IGNORECASE)
    if match_range:
        start = int(match_range.group(1)) * 1000
        end = int(match_range.group(2)) * 1000 if match_range.group(2) else start
        return end, raw
    match_plain = re.search(r"(\d+)", raw)
    if match_plain:
        value = int(match_plain.group(1))
        return value, raw
    return None, raw

def parse_budget_tables():
    budgets = {}
    labels = {}

    claude_md = repo_root / "CLAUDE.md"
    pipeline_md = repo_root / "PIPELINE.md"

    if claude_md.exists():
        capture = False
        for line in claude_md.read_text(encoding="utf-8").splitlines():
            if line.startswith("### Token budget per feature cycle"):
                capture = True
                continue
            if capture and line.startswith("---"):
                break
            if capture and line.startswith("|") and "Target tokens" not in line and "---" not in line:
                parts = [part.strip() for part in line.strip().strip("|").split("|")]
                if len(parts) < 3:
                    continue
                phase_text = parts[0]
                budget_text = parts[2]
                if "Total" in phase_text:
                    _, label = parse_token_value(budget_text)
                    labels["first-pass-total"] = label
                    continue
                match = re.match(r"(\d+)\s+(.+)", phase_text)
                if not match:
                    continue
                phase_name = match.group(2).strip().lower()
                key = phase_name.replace(" ", "-")
                value, label = parse_token_value(budget_text)
                if value is not None:
                    budgets[key] = value
                    labels[key] = label

    if pipeline_md.exists():
        capture = False
        for line in pipeline_md.read_text(encoding="utf-8").splitlines():
            if line.startswith("| Review checkpoint | Token budget |"):
                capture = True
                continue
            if capture and (not line.startswith("|") or "Full ceiling" in line):
                if capture and line.startswith("|") and "Full ceiling" in line:
                    parts = [part.strip() for part in line.strip().strip("|").split("|")]
                    if len(parts) >= 2:
                        _, label = parse_token_value(parts[1])
                        labels["codex-full-ceiling"] = label
                break
            if capture and line.startswith("|") and "---" not in line:
                parts = [part.strip() for part in line.strip().strip("|").split("|")]
                if len(parts) < 2:
                    continue
                checkpoint, budget_text = parts[0], parts[1]
                checkpoint_lower = checkpoint.lower()
                if checkpoint_lower.startswith("code review"):
                    key = "review-code"
                elif checkpoint_lower.startswith("test design review"):
                    key = "review-test-design"
                elif checkpoint_lower.startswith("architecture review"):
                    key = "review-architecture"
                elif checkpoint_lower.startswith("prd review"):
                    key = "review-prd"
                else:
                    key = (
                        checkpoint_lower
                        .replace(" ", "-")
                        .replace("(", "")
                        .replace(")", "")
                    )
                value, label = parse_token_value(budget_text)
                if value is not None:
                    budgets[key] = value
                    labels[key] = label

    return budgets, labels

def normalize_phase(phase: str) -> str:
    phase = phase.strip().lower()
    aliases = {
        "security gate": "security-gate",
        "security": "security-gate",
        "test design": "test-design",
        "document": "document",
        "review": "review",
        "review-code": "review-code",
        "review-test-design": "review-test-design",
        "review-architecture": "review-architecture",
        "review-prd": "review-prd",
        "codex-review": "review-code",
    }
    phase = phase.replace("_", "-")
    return aliases.get(phase, phase)

if not log_file.exists():
    raise SystemExit(f"No token log found at {log_file}")

budgets, budget_labels = parse_budget_tables()

entries = []
for raw_line in log_file.read_text(encoding="utf-8").splitlines():
    raw_line = raw_line.strip()
    if not raw_line:
        continue
    try:
        entry = json.loads(raw_line)
    except json.JSONDecodeError:
        continue
    if entry.get("entry_type", "final") != "final":
        continue
    if feature_filter and entry.get("feature") != feature_filter:
        continue
    entry["phase_key"] = normalize_phase(str(entry.get("phase", "")))
    entries.append(entry)

if not entries:
    message = f"No matching entries found in {log_file}"
    if feature_filter:
        message += f" for feature {feature_filter}"
    raise SystemExit(message)

entries.sort(key=lambda item: (item.get("feature", ""), item.get("timestamp", ""), item.get("phase_key", ""), item.get("iteration", 1)))

grouped = defaultdict(list)
for entry in entries:
    grouped[entry.get("feature", "unknown")].append(entry)

def format_tokens(value: int) -> str:
    return f"{value:,}"

def status_for(entry):
    phase_key = entry["phase_key"]
    budget = budgets.get(phase_key)
    label = budget_labels.get(phase_key, "n/a")
    if entry.get("iteration", 1) > 1:
        return label, "(retry)"
    if budget is None:
        return label, "n/a"
    total = int(entry.get("total_tokens", 0))
    if total <= budget:
        return label, "ok"
    over = round(((total - budget) / budget) * 100)
    return label, f"+{over}%"

for feature, feature_entries in grouped.items():
    print(f"Feature: {feature}")
    print("-" * 77)
    print(f"{'Phase':<24} {'Agent':<22} {'Iter':>4} {'Tokens':>10} {'Budget':>10} {'Status':>10}")

    first_pass_total = 0
    retry_total = 0
    phase_iterations = defaultdict(int)

    for entry in feature_entries:
        phase = entry["phase_key"]
        agent = str(entry.get("agent", "unknown"))
        iteration = int(entry.get("iteration", 1))
        total_tokens = int(entry.get("total_tokens", 0))
        budget_label, status = status_for(entry)

        phase_iterations[phase] = max(phase_iterations[phase], iteration)
        if iteration == 1:
            first_pass_total += total_tokens
        else:
            retry_total += total_tokens

        print(
            f"{phase:<24} {agent:<22} {iteration:>4} "
            f"{format_tokens(total_tokens):>10} {budget_label:>10} {status:>10}"
        )

    combined = first_pass_total + retry_total
    retry_pct = round((retry_total / first_pass_total) * 100) if first_pass_total else 0
    codex_total = sum(
        int(entry.get("total_tokens", 0))
        for entry in feature_entries
        if entry["phase_key"].startswith("review-")
    )

    print("-" * 77)
    print("Summary:")
    print(f"  First-pass total: {format_tokens(first_pass_total)} / {budget_labels.get('first-pass-total', '~63K')}")
    print(f"  Retry total:      {format_tokens(retry_total)}")
    print(f"  Combined total:   {format_tokens(combined)}")
    print(f"  Retry overhead:   {retry_pct}% of first-pass cost")
    print(f"  Max iterations:   {max(phase_iterations.values()) if phase_iterations else 1}")
    if codex_total:
        print(f"  Codex total:      {format_tokens(codex_total)} / {budget_labels.get('codex-full-ceiling', '~12-17K ceiling')}")
    print()
PY
