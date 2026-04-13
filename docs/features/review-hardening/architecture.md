## Architecture: Review Layer Hardening
**Generated:** 2026-04-13T19:00:00Z
**ADR:** ADR-002 | Date: 2026-04-13

### Decision

Harden the review layer by: (1) adding `source_spec` as a required field in `handoff.schema.json` so reviewers always have a resolvable pointer to the originating spec, (2) embedding a Reviewer Independence section in the code-review skill with PRD-first methodology, (3) enforcing adversarial stance in gate-review roles, and (4) tagging pipeline phases as authoring vs gate/review to enforce separate-context requirements.

### Decision Confidence
High — changes are additive to existing files with no new dependencies. The `source_spec` schema change requires a migration plan for all handoff producers (see Source Spec Population below).

### Revisit When
A third gate-review role is added, or handoff.json schema gains incompatible consumers.

### Rollback / Fallback
Revert schema change (remove `source_spec` from required), revert role/skill prose additions. No data migration needed — handoff.json is ephemeral.

### Files Changed

| File | Change | Owns AC |
|------|--------|---------|
| `schemas/handoff.schema.json` | Add `source_spec` (required string). Valid: PRD path, ticket path, GitHub issue URL. Validation: must resolve to existing file or valid URL. | AC12-16 |
| `skills/code-review/SKILL.md` | Add `## Reviewer Independence` section: read source_spec before diff, treat claims as hypotheses, grep adjacent symbols, verify test fixtures, cross-read PRD vs impl. Must stay within ISS-013 budget. | AC1-4 |
| `commands/review.md` | Prepend source_spec load instruction: "First read `<source_spec>`. Then verify diff against source spec, not developer summary." | AC3, AC13 |
| `commands/security-gate.md` | Prepend source_spec load instruction, same as review.md. Phase 4 must also anchor findings to source spec. | AC5, AC12 |
| `ROLE_CODE_REVIEWER.md` | Add adversarial stance block + separate-context requirement + read-only constraint (no src/ writes). | AC5-6, AC8-9 |
| `ROLE_SECURITY.md` | Add adversarial stance block + read-only constraint (no src/ writes). | AC5, AC9 |
| Root `CLAUDE.md` pipeline table | Tag phases 1-3,5 as "authoring", phases 4,6 as "gate/review". | AC7 |
| Review artifacts (review.md, security-audit.md) | Header template: include reviewer identity + "Reviewed in separate context from authoring phase". | AC10 |

### Gate-Review Roles (enumerated per AC5)
- **ROLE_CODE_REVIEWER.md** — Phase 6 gate
- **ROLE_SECURITY.md** — Phase 4 gate

These are the only two roles that perform gate/review duties. Both receive adversarial stance and read-only enforcement.

### Module Boundaries

- **Schema layer** (`schemas/handoff.schema.json`): owns `source_spec` field definition. Validated by `checkpoint.js`.
- **Skill layer** (`skills/code-review/`): owns Reviewer Independence methodology. Must not exceed ISS-013 budget (150 prose / 250 total for inline).
- **Role layer** (`ROLE_*.md`): owns adversarial stance, separate-context, and read-only constraints.
- **Command layer** (`commands/review.md`, `commands/security-gate.md`): owns source_spec-first prompt injection into gate/review flows.

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink |
|------------------|------------|----------------|
| `handoff.source_spec` | Must resolve to existing file (PRD/ticket) or valid URL | Must not be used as executable path or template variable |
| Developer handoff claims | Treated as hypotheses by reviewer, not trusted input | Must not override source spec findings |
| Review artifacts | Written only to `docs/features/<feature>/` | Must never write to `src/` |

### Failure Modes

| Failure | Behavior |
|---------|----------|
| `source_spec` missing in handoff | `checkpoint.js` rejects handoff; review cannot start (AC16) |
| `source_spec` points to nonexistent file | Review halts with explicit error message (AC16) |
| Reviewer attempts src/ write | Role constraint violation; flagged by tests (AC9) |
| Skill exceeds size budget | Tests fail on line count check (AC4) |
| Same-role authoring and reviewing | Gate command halts: `produced_by` matches current role (AC6) |
| Non-review phase missing `source_spec` | `checkpoint.js` rejects handoff — hard cutover, all phases must populate (migration) |

### Fitness Functions
1. `source_spec` present and resolvable in every handoff.json (schema + checkpoint validation)
2. Gate-review roles contain adversarial stance section (structural anchor test)
3. Code-review skill size stays within ISS-013 budget (line count test)

### Source Spec Population (pipeline-wide migration)

Adding `source_spec` as required in `handoff.schema.json` affects all handoff producers, not just gate phases. Each phase command must populate it:

| Phase | Producer command | `source_spec` value |
|-------|-----------------|---------------------|
| 1 Specify | `commands/specify.md` | N/A — Phase 1 creates the PRD; no prior source_spec needed. Handoff sets `source_spec` to the PRD it just produced. |
| 2 Architect | `commands/architect.md` | PRD path (from Phase 1 handoff) |
| 3 Test Design | `commands/test-design.md` | PRD path (carried forward) |
| 4 Security Gate | `commands/security-gate.md` | PRD path (carried forward) |
| 5 Implement | `commands/implement.md` | PRD path (carried forward) |
| 6 Review | `commands/review.md` | PRD path (carried forward) |
| 7 Document | `commands/document.md` | PRD path (carried forward) |
| Ad-hoc bugfix | Developer | Ticket path (`docs/issues/tickets/ISS-NNN.md`) or GitHub issue URL (AC15) |

**Migration**: Update each phase command template to propagate `source_spec` from the incoming handoff. Phase 1 sets it initially. `checkpoint.js` validates presence. Existing handoffs without `source_spec` will fail validation — this is intentional (hard cutover, not gradual).

### Separate-Context Enforcement (AC6)

"Separate context" means: different agent session with no carried-over framing beyond machine-readable handoff.json fields. The reviewer must re-derive coverage expectations from the source spec independently.

**Detection mechanism**: `checkpoint.js` records `produced_by` in each handoff. Gate-phase commands (review, security-gate) check that `produced_by` in the incoming handoff differs from the current agent role. If the same role that authored also reviews, the command halts with: "Review requires separate context: current role matches handoff.produced_by."

**Known limitation**: This check catches same-role continuity (e.g., developer reviewing their own code) but not same-agent-different-role continuity (e.g., one session acting as developer then switching to code-reviewer). Full session-lineage tracking is not feasible in a prompt-driven pipeline. Mitigations: (1) role docs instruct gate reviewers to re-derive expectations from source_spec independently, (2) review artifact headers must state "Reviewed in separate context from authoring phase", (3) structural tests verify these instructions exist. This is defense-in-depth via layered prose + deterministic role check, not a complete runtime guarantee.

**Residual risk**: An operator manually invoking a gate command in the same session that authored the work can bypass the role check. This is accepted — the pipeline is designed for agent-per-phase invocation, and human operators bypassing it are making an informed choice.

### Rejected Alternatives
1. **Full session-lineage tracking for separate context** — rejected because the pipeline has no session registry or agent identity system. Would require new infrastructure (session IDs, lineage graph) disproportionate to the risk. The `produced_by` role check + layered prose mitigations are accepted as sufficient for the agent-per-phase invocation model.
2. **Making source_spec optional with fallback inference** — rejected because silent inference from branch names creates hidden trust (AC14-15 explicitly require explicit declaration).
