#!/usr/bin/env node
/**
 * restore-context.js
 * Runs via SessionStart hook. Injects top-scored archived turns as additionalContext.
 *
 * Install: place at .claude/helpers/restore-context.js
 */

const fs = require('fs');
const path = require('path');

const ARCHIVE_FILE = path.join(process.cwd(), '.claude', 'context-archive', 'turns.json');
const RESTORE_TOP_N = 5;
const MAX_CHARS = 2000;

function main() {
  if (!fs.existsSync(ARCHIVE_FILE)) {
    process.exit(0);
  }

  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
  } catch {
    process.exit(0);
  }

  if (!archive.length) process.exit(0);

  const top = archive
    .sort((a, b) => b.score - a.score)
    .slice(0, RESTORE_TOP_N);

  let restored = '## Restored context from previous sessions\n\n';
  let charCount = restored.length;

  for (const turn of top) {
    const entry = `- [score:${turn.score}] ${turn.content}\n`;
    if (charCount + entry.length > MAX_CHARS) break;
    restored += entry;
    charCount += entry.length;
  }

  restored += '\n---\n';
  process.stdout.write(restored);
}

main();