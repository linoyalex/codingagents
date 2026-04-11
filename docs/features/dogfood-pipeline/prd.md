## Feature: Dogfood Pipeline (ISS-005)
**Phase:** Specify | Date: 2026-04-06

### User Story

As a framework maintainer,
I want to run ISS-001 (invariants-audit skill) through the complete 7-phase codingagents pipeline in this source repo,
So that I can validate the pipeline's real-world usability, identify framework bugs, and establish self-development practice.

### Acceptance Criteria

- [ ] **AC1 (Happy Path - Install):** Given the current framework source, When the dogfood install runs, Then `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/helpers/`, `.claude/schemas/` and `.claude/settings.json` exist with correct copies of all required files.
- [ ] **AC2 (Happy Path - Pipeline Execution):** Given ISS-001 is queued, When phases 1-7 execute in order, Then each phase writes a valid `handoff.json` and the next phase successfully reads and uses it.
- [ ] **AC3 (Happy Path - Verification):** Given a phase completes, When `checkpoint.js` runs on Stop, Then token usage is logged, phase detection is correct, and handoff schema validation passes.
- [ ] **AC4 (Error State - Hooks):** Given a phase writes an invalid handoff.json, When the next phase starts and `restore-context.js` runs, Then an error is logged (not silently skipped) and the agent is notified.
- [ ] **AC5 (Empty State - Artifacts):** Given a fresh run, When phases 1-3 complete before implementation, Then `docs/features/invariants-audit/` contains only `prd.md`, `architecture.md`, and `security-audit.md`.
- [ ] **AC6 (CLAUDE.md Correctness):** Given ISS-005 is in progress, When Phase 2 and Phase 7 agents work, Then they receive correct scoped context from `docs/CLAUDE.md`, not the root template.
- [ ] **AC7 (Gitignore Compliance):** Given the dogfood install, When `.gitignore` is checked, Then runtime artifacts are ignored per `.gitignore-template`; installed framework files are not blanket-ignored.
- [ ] **AC8 (Backlog Logging):** Given each phase executes, When framework bugs or usability issues are encountered, Then they are logged to `docs/issues/backlog.md` with links to the phase where they surfaced.
- [ ] **AC9 (Token Tracking):** Given the full run completes, When token usage is aggregated, Then actual per-phase costs are compared to budget targets and variance > 20% is documented.

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| **Phase Execution** | No phase command invoked; CLI awaits `/specify`, `/architect`, etc. | Agent session active; awaiting model response | handoff.json produced with required fields; verification checklist visible | Phase failed; handoff.json missing/invalid; error logged with remediation hint | Phase completed; handoff.json validated; next phase ready |
| **Handoff Validation** | Session ending; no handoff artifact written yet | checkpoint.js scanning for handoff.json | handoff.json parsed; schema validation running | handoff.json missing/invalid; checkpoint blocks with error details | handoff.json validated; tokens logged; pipeline-checkpoint.json written |
| **Token Tracking** | No token usage recorded (fresh feature) | Aggregating tokens from completed phases | Per-phase costs vs. budget visible; cumulative total calculated | Budget exceeded for a phase; warning with overage % | All phases within budget; final report vs. ~63K target |
| **Context Restoration** | Fresh session; handoff.json not yet loaded | restore-context.js reading handoff.json | Handoff context injected; feature state and prior-phase goals visible | handoff.json corrupted; restore skips; agent must backfill | Handoff context loaded; agent oriented to feature and phase |

### Out of Scope

- Redesigning the pipeline install shape or moving framework files
- Changing root `CLAUDE.md` template based on this run alone
- Codex review integration or Codex-specific layer validation
- Performance optimization of hooks or agents
- Automated testing of `init.sh` / `upgrade.sh` (covered by `test-install-scripts.sh`)

### Dependencies

- ISS-001 (invariants-audit skill) must have clear acceptance criteria
- `.gitignore-template` behavior is stable
- Both `CLAUDE.md` files are loadable by Claude Code
- Hooks (`checkpoint.js`, `restore-context.js`) are in working state

### RICE Score

| Reach | Impact | Confidence | Effort | **Score** |
|-------|--------|------------|--------|-----------|
| 10 | 3 | 80% | 2 wks | **120** |

### Definition of Done

- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
