# Feature: Review Layer Hardening
**Generated:** 2026-04-13T10:00:00Z

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

**AC4:** **Given** code-review skill current size; **When** Reviewer Independence added; **Then** stay under ISS-013 budget (~300 lines code-review).

### ISS-014: Adversarial Reviewers & Separate Context

**AC5:** **Given** gate role definition (ROLE_SECURITY.md, ROLE_CODE_REVIEWER.md); **When** reviewer starts phase; **Then** challenge assumptions, verify bypass paths, check stale state, verify trust boundaries, flag contradictions.

**AC6:** **Given** implementation/security phase ends; **When** review command runs; **Then** fresh session (clean context, no carryover).

**AC7:** **Given** CLAUDE.md pipeline; **When** phases examined; **Then** phases 1–5 marked "authoring", phases 4, 6 marked "gate/review".

**AC8:** **Given** adversarial stance active; **When** examining implementation; **Then** ask: guard failures? stale state? unauthorized state access?

**AC9:** **Given** gate reviewer completes phase; **When** writing findings; **Then** zero commits to src/, only docs/features/<feature>/.

**AC10:** **Given** review document (review.md, security-audit.md); **When** header included; **Then** include Reviewer identity + "Reviewed in independent context (fresh session)".

**AC11:** **Given** tests written for review-hardening; **When** they run; **Then** verify: role definitions enforce adversarial stance, handoff includes source_spec, commands reject missing source_spec.

### ISS-033: Source Spec Verification

**AC12:** **Given** code-review phase runs; **When** reviewer loads handoff; **Then** read source spec (PRD from handoff.source_spec) before reading diff.

**AC13:** **Given** code-review command templated; **When** generating initial prompt; **Then** prompt: "First read <source_spec_path>. Then verify diff matches PRD, not developer summary."

**AC14:** **Given** handoff.json written; **When** validated; **Then** include source_spec field pointing to canonical spec (PRD path or ticket URL).

**AC15:** **Given** bugfix with no PRD; **When** handoff.source_spec missing; **Then** fall back to: commit message ticket URL, GitHub issue link, or Slack thread (logged).

**AC16:** **Given** reviewer detects source_spec missing/unresolvable; **When** reaching check; **Then** stop with: "Review halted: source_spec unresolvable. Provide ticket URL or PRD path in handoff.source_spec."

**AC17:** **Given** test suite runs; **When** handoff/reviewer requirements change; **Then** fail if: source_spec removed from schema, review commands skip PRD, gate roles lose adversarial requirement.

**AC18:** **Given** CLAUDE.md, commands/review.md, role docs updated; **When** read by agents; **Then** reference source_spec handling, adversarial stance, reviewer independence.

---

## Screen States (Developer Experience)

| Workflow | Normal | Error | Success |
|----------|--------|-------|---------|
| **Code Review** | Reviewer reads PRD from handoff.source_spec before diff | source_spec missing → review halted | Independent findings with PRD cross-ref |
| **Security Review** | Adversarial stance active; challenge assumptions | Rubber-stamps hidden trust boundaries | Blocking findings implementation phase missed |
| **Source Spec Verification** | Reviewer traces to ticket/PRD via handoff.source_spec | source_spec unresolvable → error | Mismatch between PRD and impl surfaced |
| **Handoff Source-Spec** | handoff.json includes source_spec with resolvable path | Field missing or invalid | Pointer resolves, reviewer verifies against source |

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
