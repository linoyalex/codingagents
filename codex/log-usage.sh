#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 8 || $# -gt 10 ]]; then
  cat <<'EOF' >&2
Usage: ./codex/log-usage.sh <feature> <phase> <agent> <model> \
       <input_tokens> <output_tokens> <duration_seconds> <verification_passed> \
       [cycle] [token_source]
EOF
  exit 1
fi

FEATURE="$1"
PHASE="$2"
AGENT="$3"
MODEL="$4"
INPUT_TOKENS="$5"
OUTPUT_TOKENS="$6"
DURATION_SECONDS="$7"
VERIFICATION_PASSED="$8"
CYCLE="${9:-}"
TOKEN_SOURCE="${10:-api}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${REPO_ROOT}/.claude"
LOG_FILE="${LOG_DIR}/token-usage.jsonl"

mkdir -p "${LOG_DIR}"
touch "${LOG_FILE}"

python3 - "$LOG_FILE" "$FEATURE" "$PHASE" "$AGENT" "$MODEL" "$INPUT_TOKENS" "$OUTPUT_TOKENS" "$DURATION_SECONDS" "$VERIFICATION_PASSED" "$CYCLE" "$TOKEN_SOURCE" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

(
    log_file,
    feature,
    phase,
    agent,
    model,
    input_tokens,
    output_tokens,
    duration_seconds,
    verification_passed,
    cycle,
    token_source,
) = sys.argv[1:]

def as_int(value: str, field: str) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise SystemExit(f"{field} must be an integer: {value}") from exc

def as_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    raise SystemExit(f"verification_passed must be true/false: {value}")

input_value = as_int(input_tokens, "input_tokens")
output_value = as_int(output_tokens, "output_tokens")
duration_value = as_int(duration_seconds, "duration_seconds")
verification_value = as_bool(verification_passed)

path = Path(log_file)
entries = []
if path.exists():
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

matching_entries = [
    entry for entry in entries
    if entry.get("feature") == feature
    and entry.get("phase") == phase
    and entry.get("entry_type", "final") == "final"
]
iteration = len(matching_entries) + 1

if not cycle:
    cycle = "full" if iteration == 1 else "implement-review"

entry = {
    "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    "feature": feature,
    "phase": phase,
    "agent": agent,
    "model": model,
    "iteration": iteration,
    "cycle": cycle,
    "input_tokens": input_value,
    "output_tokens": output_value,
    "total_tokens": input_value + output_value,
    "cache_read_tokens": 0,
    "duration_seconds": duration_value,
    "verification_passed": verification_value,
    "token_source": token_source,
    "entry_type": "final",
}

with path.open("a", encoding="utf-8") as fh:
    fh.write(json.dumps(entry, separators=(",", ":")) + "\n")

print(
    f"Logged {feature} / {phase} / iteration {iteration} "
    f"to {path}"
)
PY
