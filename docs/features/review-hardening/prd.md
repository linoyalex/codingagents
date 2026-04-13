# Feature: Review Layer Hardening
**Generated:** 2026-04-13T16:00:00Z

**Phase:** Specify | **Date:** 2026-04-13 | **Tickets:** ISS-024, ISS-014, ISS-033

---

## User Story

As a **code reviewer or security gate**, I want to **verify implementation claims against source specifications independently**, so that **hidden assumptions, stale state, and trust boundary failures are caught before merging**.

---

## Problem Statement

Today reviewers trust developer framing without verifying against source specs. This allows: (1) unverified test claims, (2) hidden assumptions unchallenged, (3) no spec traceability in handoffs.

---

## Acceptance Criteria

### ISS-024: Reviewer Independence & Boundary Tracing

**AC1:** **Given** code-review skill open; **When** reviewer reads methodology; **Then** they see Reviewer Independence section: read PRD before handoff, treat claims as hypotheses to falsify, grep adjacent symbols, verify test coverage by reading fixtures, cross-read PRD vs implementation.

**AC2:** **Given** reviewer checking parse/validate/transform chain; **When** encountering new field; **Then** verify schema includes it, trace one test case (input → schema → consumer), document path.

**AC3:** **Given** review command invoked; **When** checking handoff.json; **Then** also load PRD, treat handoff as secondary to source spec.

**AC4:** **Given** code-review skill current size; **When** Reviewer Independence added; **Then** stay under ISS-013 budget (≤150 prose lines for inline skills, ≤120 prose for progressive-disclosure; 250 total triggers split). Existing tests pass.

### ISS-014: Adversarial Reviewers & Separate Context

**AC5:** **Given** gate role definitions (ROLE_SECURITY.md, ROLE_CODE_REVIEWER.md, and any other relevant gate-review roles — enumerate at architecture time); **When** reviewer starts phase; **Then** explicitly adopt adversarial-but-constructive stance: challenge hidden assumptions, verify bypass paths, check stale state, verify trust boundaries, flag contradictory artifacts.

**AC6:** **Given** implementation/security phase ends; **When** review command runs; **Then** require separate context from the authoring phase — not just a generic fresh session. This means: different agent session, no carried-over handoff framing beyond the machine-readable handoff.json fields, and no same-agent continuity. The reviewer must re-derive coverage expectations from the source spec independently.

**AC7:** **Given** CLAUDE.md pipeline; **When** phases examined; **Then** phases 1–5 marked "authoring", phases 4, 6 marked "gate/review".

**AC8:** **Given** adversarial stance active; **When** examining implementation; **Then** ask: guard failures? stale state? unauthorized state access?

**AC9:** **Given** gate reviewer completes phase; **When** writing findings; **Then** zero commits to src/, only docs/features/<feature>/.

**AC10:** **Given** review document (review.md, security-audit.md); **When** header included; **Then** include Reviewer identity + "Reviewed in separate context from authoring phase" (not just "fresh session").

**AC11:** **Given** tests written for review-hardening; **When** they run; **Then** verify: (a) role definitions enforce adversarial stance, (b) handoff schema requires source_spec, (c) commands reject missing source_spec, (d) review commands require separate context (not just fresh session), (e) gate reviewers are read-only (no src/ writes), (f) pipeline phases are tagged as authoring vs gate/review.

### ISS-033: Source Spec Verification

**AC12:** **Given** code-review phase runs; **When** reviewer loads handoff; **Then** read source spec (PRD from handoff.source_spec) before reading diff.

**AC13:** **Given** code-review command templated; **When** generating initial prompt; **Then** prompt: "First read <source_spec_path>. Then verify diff matches PRD, not developer summary."

**AC14:** **Given** handoff.json written; **When** validated; **Then** `source_spec` field is required (not optional). Valid values: PRD path (for features) or ticket path/URL (for bugfixes). The field must always be present and resolve to an existing artifact.

**AC15:** **Given** bugfix with no PRD; **When** handoff.source_spec is written; **Then** it must point to the originating ticket (e.g., `docs/issues/tickets/ISS-NNN.md`) or declared source spec — not left empty. The fallback source must be explicit in the handoff, not inferred from branch name or chat history. Precedence: ticket file > GitHub issue URL > other declared source.

**AC16:** **Given** reviewer detects source_spec missing or unresolvable; **When** reaching check; **Then** stop with: "Review halted: source_spec missing or unresolvable. Provide ticket path or PRD path in handoff.source_spec." Review must not proceed without a resolvable source spec.

**AC17:** **Given** test suite runs; **When** handoff/reviewer requirements change; **Then** fail if: source_spec removed from schema, review commands skip PRD, gate roles lose adversarial requirement.

**AC18:** **Given** CLAUDE.md, commands/review.md, role docs updated; **When** read by agents; **Then** reference source_spec handling, adversarial stance, reviewer independence.

---

## Screen States (Developer Experience)

| Workflow | Normal | Error | Success |
|----------|--------|-------|---------|
| **Code Review** | Reviewer reads PRD from handoff.source_spec before diff | source_spec missing → review halted | Independent findings with PRD cross-ref |
| **Security Review** | Adversarial stance active; challenge assumptions | Rubber-stamps hidden trust boundaries | Blocking findings implementation phase missed |
| **Source Spec Verification** | Reviewer traces to ticket/PRD via handoff.source_spec | source_spec unresolvable → error | Mismatch between PRD and impl surfaced |
| **Handoff Source-Spec** | handoff.json includes source_spec with resolvable path | Field missing or invalid — validation rejects handoff | Pointer resolves, reviewer verifies against source |
| **Source Spec Conflict** | Source spec and downstream artifact agree | source_spec exists but conflicts with PRD or implementation | Reviewer stops and surfaces mismatch (AC16) |
| **No-PRD Bugfix** | source_spec points to ticket file | Multiple plausible sources (ticket, commit, chat) | Precedence applied: ticket > issue URL > declared source (AC15) |
| **Same-Agent Review** | Review launched in separate context from authoring | Fresh session but same agent lineage | Rejected — separate context required per AC6 |

---

## Out of Scope

- skills/tdd/ changes (ISS-022, Branch A)
- Invariants-audit skill (ISS-001, Batch 3)
- Mass skill progressive disclosure (ISS-013)
- architect / ux-designer role changes (reviewers only)

---

## Dependencies

- **Blocker:** ISS-013 must land first (skill size budget)
- No internal dependency between ISS-024/014/033 (all touch same files, bundled as one feature)

---

## RICE Score

| Metric | Value |
|--------|-------|
| Reach | 8/10 |
| Impact | 9/10 |
| Confidence | 8/10 |
| Effort | 5/10 |
| **Score** | **136** |

---

## Definition of Done

- [ ] All 18 ACs pass
- [ ] QA signed off
- [ ] No P1/P2 bugs open
- [ ] skills/code-review/SKILL.md updated (Reviewer Independence section)
- [ ] commands/review.md references source_spec handling
- [ ] ROLE_SECURITY.md, ROLE_CODE_REVIEWER.md created/updated
- [ ] schemas/handoff.schema.json updated (source_spec required)
- [ ] Regression tests verify handoff format and reviewer instructions
