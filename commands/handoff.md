Before this session ends or context gets too large, create a compact handoff note.

Steps:
1. Read .claude/pipeline-checkpoint.json if it exists
2. Summarise in under 30 lines:
   - Feature being worked on
   - Current pipeline phase and what was completed this session
   - Key decisions made (anything that would be in an ADR)
   - Any constraints discovered (gotchas, unexpected API behaviour, etc.)
   - Exact next step with the command to run in the new session
3. Write to: .claude/handoff-note.md
4. Commit: "chore: session handoff note"

At the start of your NEXT session, run /status to resume cleanly.