# Closed

> Resolved tickets with date and resolution. Full details in `tickets/ISS-NNN.md`.
> See `skills/backlog-management/SKILL.md` for conventions.

| ID | Priority | Type | Title | Closed | Resolution |
|----|----------|------|-------|--------|------------|
| [ISS-002](tickets/ISS-002.md) | P1 — High | Bug | Phase 6 writes forward handoff on REQUEST_CHANGES | 2026-04-06 | Fixed in `commands/review.md`; regression test added |
| [ISS-003](tickets/ISS-003.md) | P1 — High | Bug | Phase 4 writes handoff on BLOCKING security findings | 2026-04-06 | Fixed in `commands/security-gate.md`; regression test added |
| [ISS-004](tickets/ISS-004.md) | P2 — Medium | Bug | Phase 4 verification regex mismatch with template | 2026-04-06 | Fixed in `skills/verification-gate/SKILL.md`; regression tests added |
| [ISS-010](tickets/ISS-010.md) | P2 — Medium | Feature | Refresh core skills with robustness guards | 2026-04-10 | All 4 core skills refreshed; rework passed adversarial review; Phase 7 docs complete |
| [ISS-009](tickets/ISS-009.md) | P1 — High | Bug | `/implement` can proceed after mangled command arguments by silently falling back to handoff feature | 2026-04-11 | All pipeline commands (Phases 2-7) wired through resolve-feature.js; 18 regression tests added |
| [ISS-026](tickets/ISS-026.md) | P2 — Medium | Feature | Add generated timestamps to feature artifacts | 2026-04-13 | Timestamp convention added across generated feature artifacts, Codex reviewer prompts, and templates; regression coverage added |
| [ISS-013](tickets/ISS-013.md) | P2 — Medium | Architecture | Revise skill size convention and adopt progressive disclosure | 2026-04-13 | New ~150 prose / 250 total budget; progressive disclosure pattern with verification-gate pilot; stop conditions footer rule; 37 tests; root/docs CLAUDE.md synced |
| [ISS-022](tickets/ISS-022.md) | P1 — High | Feature | Harden Phase 3 test design with integration-level coverage requirements | 2026-04-13 | Three-level test coverage (unit/integration/E2E) added to TDD skill; fixture validation and degenerate-input rules; blocking Phase 3 verification; 21 contract tests |
| [ISS-005](tickets/ISS-005.md) | P1 — High | Feature | Dogfood — use codingagents to develop codingagents | 2026-04-13 | Pipeline validated through 3 full feature cycles (ISS-013, ISS-026, ISS-022). ISS-001 dependency dropped — dogfood proof is the backlog itself (37 tickets filed from real usage). Token tracking deferred to separate observability ticket. |
| [ISS-029](tickets/ISS-029.md) | P2 — Medium | Feature | Add clarification checkpoints + ticket fidelity check to `/specify` and `/architect` | 2026-04-13 | Clarification checkpoints added to `/specify` and `/architect`; ticket fidelity checks; checkpoint resumption with correct model attribution; full test coverage |
