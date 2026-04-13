## Architecture: Review Layer Hardening
**Generated:** 2026-04-13T17:30:00Z
**ADR:** ADR-002 | Date: 2026-04-13

### Decision

Harden the review layer by: (1) adding `source_spec` as a required field in `handoff.schema.json` so reviewers always have a resolvable pointer to the originating spec, (2) embedding a Reviewer Independence section in the code-review skill with PRD-first methodology, (3) enforcing adversarial stance in gate-review roles, and (4) tagging pipeline phases as authoring vs gate/review to enforce separate-context requirements.

### Decision Confidence
High — all changes are additive to existing skill/role/schema files with no new dependencies.

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
- **Command layer** (`commands/review.md`): owns source_spec-first prompt injection into review flow.

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

### Fitness Functions
1. `source_spec` present and resolvable in every handoff.json (schema + checkpoint validation)
2. Gate-review roles contain adversarial stance section (structural anchor test)
3. Code-review skill size stays within ISS-013 budget (line count test)

### Separate-Context Enforcement (AC6)
"Separate context" means: different agent session with no carried-over framing beyond machine-readable handoff.json fields. The reviewer must re-derive coverage expectations from the source spec independently. This is stronger than "fresh session" — it requires that the reviewing agent has no continuity with the authoring agent's session. Review artifact headers must state "Reviewed in separate context from authoring phase".

### Rejected Alternatives
1. **Runtime enforcement of separate context via tooling** — rejected because the pipeline is prompt-driven, not runtime-enforced. Structural tests on role docs and artifact headers are sufficient and simpler.
2. **Making source_spec optional with fallback inference** — rejected because silent inference from branch names creates hidden trust (AC14-15 explicitly require explicit declaration).
