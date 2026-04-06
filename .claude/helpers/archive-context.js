#!/usr/bin/env node
/**
 * archive-context.js
 * Runs via PreCompact hook before Claude auto-compacts the context window.
 * Scores and saves the highest-value conversation turns to a JSON archive.
 * Logs a token usage snapshot before compaction.
 *
 * Install: place at .claude/helpers/archive-context.js
 */

const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(process.cwd(), '.claude', 'context-archive');
const ARCHIVE_FILE = path.join(ARCHIVE_DIR, 'turns.json');
const TOKEN_LOG = path.join(process.cwd(), '.claude', 'token-usage.jsonl');
const SESSION_STATE_FILE = path.join(process.cwd(), '.claude', '.session-state.json');
const MAX_ARCHIVED_TURNS = 50;

const IMPORTANCE_SIGNALS = [
  { pattern: /decision|decided|chose|rejected/i, score: 3 },
  { pattern: /error|bug|fix|broken/i, score: 2 },
  { pattern: /architecture|pattern|constraint/i, score: 3 },
  { pattern: /BLOCKING|CRITICAL|DO NOT/i, score: 4 },
  { pattern: /ARCH-|ADR-|prd\.md/i, score: 3 },
  { pattern: /test.*pass|all.*green/i, score: 2 },
];

function scoreText(text) {
  return IMPORTANCE_SIGNALS.reduce((score, { pattern, score: s }) =>
    pattern.test(text) ? score + s : score, 1
  );
}

function logTokenSnapshot() {
  let sessionState = {};
  if (fs.existsSync(SESSION_STATE_FILE)) {
    try {
      sessionState = JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf8'));
    } catch { /* use defaults */ }
  }

  const startTime = sessionState.startTime || Date.now();
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  const entry = {
    timestamp: new Date().toISOString(),
    feature: sessionState.feature || 'unknown',
    phase: 'unknown',
    agent: sessionState.agent || 'unknown',
    model: sessionState.model || 'unknown',
    iteration: 0,
    cycle: 'full',
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cache_read_tokens: 0,
    duration_seconds: durationSeconds,
    verification_passed: null,
    token_source: 'estimated',
    entry_type: 'snapshot',
  };

  // Try to read token stats from environment if available
  if (process.env.CLAUDE_CODE_INPUT_TOKENS) {
    entry.input_tokens = parseInt(process.env.CLAUDE_CODE_INPUT_TOKENS, 10) || 0;
    entry.output_tokens = parseInt(process.env.CLAUDE_CODE_OUTPUT_TOKENS, 10) || 0;
    entry.total_tokens = entry.input_tokens + entry.output_tokens;
    entry.cache_read_tokens = parseInt(process.env.CLAUDE_CODE_CACHE_READ_TOKENS, 10) || 0;
    entry.token_source = 'api';
  }

  try {
    const dir = path.dirname(TOKEN_LOG);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TOKEN_LOG, JSON.stringify(entry) + '\n');
    console.log(`[token-tracking] Pre-compaction snapshot logged`);
  } catch (err) {
    console.error(`[token-tracking] Snapshot failed (non-blocking): ${err.message}`);
  }
}

async function main() {
  // Log token snapshot before compaction
  logTokenSnapshot();

  let input = '';
  if (!process.stdin.isTTY) {
    for await (const chunk of process.stdin) {
      input += chunk;
    }
  }

  let session = {};
  try {
    session = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const turns = session?.transcript || session?.messages || [];
  if (!turns.length) process.exit(0);

  const scored = turns
    .filter(t => t.role === 'assistant' && t.content)
    .map(t => ({
      role: t.role,
      content: typeof t.content === 'string'
        ? t.content.slice(0, 500)
        : JSON.stringify(t.content).slice(0, 500),
      score: scoreText(typeof t.content === 'string' ? t.content : JSON.stringify(t.content)),
      timestamp: t.timestamp || Date.now(),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ARCHIVED_TURNS);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  let existing = [];
  if (fs.existsSync(ARCHIVE_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    } catch { existing = []; }
  }

  const merged = [...existing, ...scored]
    .filter((t, i, arr) => arr.findIndex(x => x.content === t.content) === i)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ARCHIVED_TURNS * 2);

  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(merged, null, 2));
  console.log(`[archive-context] Archived ${scored.length} turns. Total: ${merged.length}`);
}

main().catch(err => {
  console.error('[archive-context] Error (non-blocking):', err.message);
  process.exit(0);
});
