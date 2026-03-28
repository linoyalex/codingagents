#!/usr/bin/env node
/**
 * archive-context.js
 * Runs via PreCompact hook before Claude auto-compacts the context window.
 * Scores and saves the highest-value conversation turns to a JSON archive.
 *
 * Install: place at .claude/helpers/archive-context.js
 */

const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(process.cwd(), '.claude', 'context-archive');
const ARCHIVE_FILE = path.join(ARCHIVE_DIR, 'turns.json');
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

async function main() {
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