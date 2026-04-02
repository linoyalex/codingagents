# v5 Settled Design Decisions

These decisions were made during v5 (2026-04-01/02) through iterative Claude + Codex review. They are settled and should not be reopened unless new evidence contradicts them.

1. **Handoff is blocking from day one.** `checkpoint.js` exits non-zero if `.claude/handoff.json` is missing or fails schema validation. This is the one non-safety blocking gate.

2. **Artifact-based phase detection, handoff-based attribution.** The Stop hook detects the completed phase from pipeline artifacts (file existence checks across all 7 phases) and uses the handoff for feature and `produced_by` attribution. This is more reliable than incomplete heuristics but still artifact-driven, not purely handoff-driven.

3. **Agent/model attribution from handoff, not self-reported.** Stop hook reads `produced_by` from handoff and infers model from the pipeline routing map. SessionStart records timing and feature context.

4. **Codex is advisory, never blocking.** The Claude pipeline works identically with or without Codex. Codex findings are capped at 500 tokens when injected back.

5. **`.gitignore-template` is the single source of truth** for runtime artifact patterns. Both `init.sh` and `upgrade.sh` consume it. Never inline ignore entries in scripts.

6. **Deployment is copy-based, not symlinked.** Target projects get file snapshots. `init.sh` is idempotent.

7. **Token tracking is informational, not enforcing.** Budgets are targets, not limits. No phase stops because it exceeded a token budget.
