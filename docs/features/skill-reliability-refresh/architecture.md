# Architecture: Skill Reliability Refresh (ISS-010)

**Phase:** Architect | Date: 2026-04-07

## Decision

Refresh the four core skills and their paired commands by front-loading only the highest-leverage instructions, tightening output expectations, and adding explicit stop/recovery guidance for ambiguous or stale inputs. Keep the role/command/skill split intact: skills define reusable method, commands define phase-local reads/writes, and tests protect the most failure-prone contract points.

## AD1 -- Structured Skill Headers

**Decision:** Add compact headers to core skills covering success criteria, allowed inputs, deliverables, verification, and stop conditions where they materially improve reliability.

**Why:** Current guidance is strong but key rules are scattered. Front-loading high-signal sections follows current prompt best practice and reduces missed context without requiring longer skills.

## AD2 -- Reliability Over Rule Volume

**Decision:** Prefer fewer, sharper instructions over adding broad new prose. New fields are allowed only when they reduce ambiguity or improve downstream review/testability.

**Why:** The main risk is instruction sprawl. The refresh should improve reliability per token, not increase prompt volume by default.

## AD3 -- Companion Command Alignment

**Decision:** Update `specify`, `architect`, `test-design`, and `implement` when the refreshed skills change what counts as a valid output or stop condition.

**Why:** Skill-only changes are brittle if commands still point agents at older expectations.

## AD4 -- Deterministic Contract Coverage

**Decision:** Add tests that assert the new high-leverage guidance exists in core skills and that command text references the aligned behavior.

**Why:** These are prompt contracts. Lightweight text-based regression tests are sufficient and avoid building a heavier prompt runtime.

## Data Model Changes

None.

## API Contract

None.

## Module Boundaries

| Component | Owner | Responsibility |
|-----------|-------|----------------|
| `skills/prd-writing/SKILL.md` | skill layer | Sharper spec-writing constraints and output expectations |
| `skills/architecture-decision/SKILL.md` | skill layer | ADR/architecture reliability, revisit/rollback/trust-boundary guidance |
| `skills/tdd/SKILL.md` | skill layer | TDD execution quality, intended-failure validation, concrete case selection |
| `skills/verification-gate/SKILL.md` | skill layer | Deterministic, feature-scoped verification and stop conditions |
| `commands/specify.md` | command layer | PRD-writing alignment with refined skill outputs |
| `commands/architect.md` | command layer | Architecture output alignment with revised architecture skill |
| `commands/test-design.md` | command layer | RED-state and case-selection alignment with TDD skill |
| `commands/implement.md` | command layer | TDD execution and stop-condition alignment |
| `tests/node/*` + `tests/test-command-contracts.sh` | verification | Protect the new prompt contracts |

## Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Skill gets longer but not clearer | Review diff shows added prose without stronger structure | Remove low-signal wording; keep only fields tied to reliability |
| Skill and command drift | Contract tests or review catch mismatched expectations | Update command and skill in the same change set |
| Verification remains too coarse | Tests still pass while feature-scoped intent is missing | Tighten examples and contract assertions |
| New rules conflict with old rules | Review of core skills finds duplicated or contradictory guidance | delete weaker rule; keep one authoritative instruction |

## Fitness Functions

1. Core skills expose compact high-signal sections for outcomes/verification/stop behavior.
2. Paired commands reference the updated expectations instead of stale wording.
3. Tests fail if the new reliability-critical guidance is removed.

## Rejected Alternatives

1. **Refresh every skill at once** -- too much change for the first pass; core skills have the highest leverage.
2. **Add long “best practices” prose to all skills** -- increases context load without guaranteeing better behavior.
3. **Create a new prompt orchestration layer** -- unnecessary for this issue; alignment and sharper instructions are enough.
