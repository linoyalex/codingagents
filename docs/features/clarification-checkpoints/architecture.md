## Architecture: Clarification Checkpoints & Ticket Fidelity
**Generated:** 2026-04-13T23:00:00Z
**ADR:** ADR-002 | Date: 2026-04-13
**Source PRD:** [prd.md](prd.md)

### Decision

Add human checkpoints and ticket fidelity verification to the `/specify` and `/architect` commands by modifying the command instruction files and extending the `prd-writing` skill with a ticket fidelity procedure. No new runtime code, hooks, or schemas are required — the behavior is implemented as agent instructions that change the command flow sequence.

### Decision Confidence
High — the change surface is small (two command files, one skill file, one test file) and fully reversible via git revert.

### Revisit When
- A third command needs human checkpoints (extract a shared `checkpoint` skill)
- Automated ambiguity detection becomes feasible (replace judgment-based triggers with heuristics)
- The ticket format changes in a way that breaks the fidelity comparison procedure

### Rollback / Fallback
Revert the command and skill file changes. The pipeline returns to one-shot artifact generation. No data model, schema, or hook changes to unwind. If the `checkpoint_pending` handoff field was added, it is optional and ignored by older pipeline phases.

---

### Module Boundaries

#### Files Modified

| File | Owner | Change | ACs Addressed |
|------|-------|--------|---------------|
| `commands/specify.md` | Command layer (WHAT) | Add ticket fidelity step + clarification gate before PRD finalization | AC0, AC0a–c, AC1, AC2, AC3, AC6, AC7 |
| `commands/architect.md` | Command layer (WHAT) | Add review checkpoint before commit/handoff | AC4, AC5, AC6, AC7 |
| `skills/prd-writing/SKILL.md` | Skill layer (HOW) | Add "Ticket Fidelity Procedure" section | AC0, AC0a, AC0b, AC0c |
| `tests/node/clarification-checkpoints.test.js` | Tests | Structural contract checks | AC8 |

#### Installed Copies (must stay in sync with source — byte-identity enforced by tests)
- `.claude/commands/specify.md` ← `commands/specify.md`
- `.claude/commands/architect.md` ← `commands/architect.md`
- `.claude/skills/prd-writing/SKILL.md` ← `skills/prd-writing/SKILL.md`

#### Files NOT Modified
- No hooks (`checkpoint.js`, `restore-context.js`) — checkpoints are instructional, not programmatic
- No role files — agent identity unchanged
- No phases 3–7 commands

#### Schema Change (optional field)
- `schemas/handoff.schema.json` — add optional `checkpoint_pending` string field (see Checkpoint Durability below)

### Design: `/specify` Command Flow

**Current flow:**
```
Read request → Write PRD → Commit → Handoff
```

**New flow:**
```
Read request
  ├─ Has ticket reference? → Ticket Fidelity Step (skill procedure)
  │    ├─ Read ticket ACs
  │    ├─ Transcribe to Given/When/Then (do not paraphrase)
  │    ├─ Flag any divergences as explicit assumptions
  │    ├─ Verify convention citations against docs/CLAUDE.md (AC0a)
  │    ├─ Check ACs for internal contradictions (AC0b)
  │    └─ Enumerate or ask about open-ended scope (AC0c)
  │
  ├─ Ambiguity detected? → Clarification Gate
  │    ├─ Ask minimum necessary questions (AC1, AC2)
  │    ├─ STOP — wait for user response (AC6)
  │    ├─ User answers → incorporate into PRD (AC3)
  │    └─ User declines/partial → record as assumptions in Dependencies
  │
  └─ No ambiguity → proceed directly
       ↓
Write PRD → Commit → Handoff
```

**Clarification triggers** (non-exhaustive, documented in command):
- Ticket references undefined terms
- ACs conflict with each other
- Scope is open-ended without enumeration
- A constraint contradicts an existing convention
- Required PRD fields cannot be inferred

### Design: `/architect` Command Flow

**Current flow:**
```
Read PRD → Write architecture.md → Commit → Handoff
```

**New flow:**
```
Read PRD → Draft architecture
  ↓
Review Checkpoint
  ├─ Present summary of proposed architecture to user
  ├─ STOP — wait for user feedback (AC6)
  ├─ User approves → finalize artifact
  └─ User requests changes → revise and re-present (AC5, loop allowed)
       ↓
Write architecture.md → Commit → Handoff
```

### Design: Ticket Fidelity Procedure (skill section)

Added as a new section in `skills/prd-writing/SKILL.md` titled "## Ticket Fidelity Procedure". This keeps the procedure co-located with the PRD writing guidance it extends. The procedure is:

1. **Read** the referenced ticket file at `docs/issues/tickets/ISS-NNN.md`
2. **Extract** the ticket's acceptance criteria
3. **Transcribe** each ticket AC into Given/When/Then — preserve scope, severity, specificity
4. **Compare** — if the PRD AC diverges from ticket intent, flag as `**Assumption (diverges from ticket AC):**` in the Dependencies section
5. **Verify conventions** — when citing a value from CLAUDE.md, read the file and confirm the value (AC0a)
6. **Contradiction check** — after all ACs are written, scan for pairs that make mutually exclusive claims (AC0b)
7. **Open-ended scope** — if the ticket says "and any other relevant X", enumerate candidates or ask the user (AC0c)

### Design: Checkpoint Durability Across Sessions

Checkpoints are primarily instructional (the command tells the agent to stop and wait). However, if a session is interrupted after the agent has stopped for user input, the checkpoint state must survive session resumption. The mechanism:

1. When a command reaches a human checkpoint, it writes `checkpoint_pending` to handoff.json before stopping (e.g., `"checkpoint_pending": "clarification"` or `"checkpoint_pending": "architecture-review"`).
2. `restore-context.js` (SessionStart hook) already loads handoff.json. If `checkpoint_pending` is set, it surfaces this in the restored context so the agent knows to resume the checkpoint rather than restart the phase.
3. When the checkpoint is resolved (user answers or approves), the command clears the field before proceeding to commit/handoff.

This is a lightweight durability mechanism — no new hooks or schema enforcement. The `checkpoint_pending` field is optional in the handoff schema so older phases ignore it.

### Design: Checkpoint Asymmetry Justification

`/specify` and `/architect` have intentionally different abandonment behavior:
- **`/specify` proceeds with assumptions** when the user declines or abandons clarification. Rationale: a PRD with explicit assumptions is still useful and can be revised. Blocking indefinitely on optional clarification would stall the pipeline for ambiguity that may not matter.
- **`/architect` blocks** when the user has not responded to the review checkpoint. Rationale: architecture decisions gate all downstream work (tests, security, implementation). Proceeding without human review defeats the feature's core contract and is more expensive to unwind.

The boundary: `/specify` clarification is advisory (caught ambiguity → better PRD); `/architect` review is a gate (unchecked architecture → cascading rework).

### Design: Structural Contract Tests (AC8)

File: `tests/node/clarification-checkpoints.test.js` (Node.js `node:test`)

Three structural checks:
1. **Checkpoint language exists** — `commands/specify.md` contains clarification gate instructions; `commands/architect.md` contains review checkpoint instructions
2. **No unconditional finalize after checkpoint** — the commit/handoff instructions appear after (below) the checkpoint section, not before or independent of it
3. **Handoff not written before checkpoint** — the handoff.json write instruction appears after the checkpoint instruction block

These tests use structural anchors (section headings, instruction ordering) not phrase-binding, per project convention.

**Coverage scope:** Structural tests verify that checkpoint instructions exist and are correctly ordered in the command files. They cannot verify multi-turn behavioral properties (staying in review across turns, resuming after feedback, avoiding finalization after no-response). Those properties are enforced by the instruction text itself and validated by manual review or future behavioral test infrastructure. This is an acknowledged coverage gap, not an oversight.

### Trust Boundaries

| Input / boundary | Validation | Forbidden sink / unsafe use |
|------------------|------------|-----------------------------|
| Ticket file content | Read from `docs/issues/tickets/` only — path constructed from ISS-NNN pattern | Never read arbitrary user-supplied paths outside tickets dir |
| User clarification answers | Recorded as-is in PRD Dependencies or incorporated into ACs | Never used to construct file paths or shell commands |
| Convention values from CLAUDE.md | Read at runtime, not cached or hardcoded | Never assume a value without reading the file |

### Failure Modes

| Failure | Behavior |
|---------|----------|
| Ticket file not found | Agent reports error and asks user whether to proceed in degraded mode (no fidelity check) or stop. If user approves degraded mode, the PRD must include a `**Degraded: ticket not found**` warning in Dependencies. Agent must not silently skip fidelity. |
| Ticket has no parseable ACs | Agent flags in Dependencies as `**Assumption: ticket ACs could not be parsed**` and asks user to confirm proceeding without fidelity check |
| User abandons clarification | Agent records unanswered questions as assumptions, proceeds to PRD |
| User never responds at architect checkpoint | Agent does not finalize — phase remains incomplete (AC6) |
| docs/CLAUDE.md missing | Fall back to root CLAUDE.md per AC0a |

### Fitness Functions

1. **Fidelity preservation** — PRD ACs must be traceable 1:1 to ticket ACs when a ticket reference is provided; no new ACs invented without explicit flagging
2. **Checkpoint ordering** — In command files, checkpoint instructions must appear before commit/handoff instructions (verified by structural test)
3. **Skill size budget** — `prd-writing/SKILL.md` must stay under 250 total lines after the new section is added
4. **Source/installed sync** — byte-identity tests enforce that source and `.claude/` installed copies remain identical for all three modified files

### Rejected Alternatives

1. **New `checkpoint` skill** — Rejected because only two commands need checkpoints. Creating a skill for two consumers is premature abstraction. Revisit if a third command needs the pattern.
2. **Hook-based checkpoint enforcement** — Rejected because hooks run at Stop/SessionStart events, not mid-command. The checkpoint is a flow instruction, not a programmatic gate.
3. **Separate `ticket-fidelity` skill** — Rejected because ticket fidelity is specific to PRD authoring. Co-locating it in `prd-writing` keeps the procedure next to the template it extends. Revisit if non-PRD phases need fidelity checks.

### Implementation Notes

- The installed copies at `.claude/skills/prd-writing/SKILL.md` and `.claude/commands/specify.md` / `.claude/commands/architect.md` must be updated in sync with source copies per project convention (byte-identity sync tests).
- The clarification gate uses `AskUserQuestion` or direct output — both are standard Claude Code interaction patterns requiring no new tooling.
- No new dependencies are introduced.
