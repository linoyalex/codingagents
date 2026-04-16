## Ticket Fidelity Procedure

> **Purpose boundary:** This file contains the ticket-to-PRD fidelity procedure — steps for
> faithfully transcribing ticket ACs into Given/When/Then, verifying conventions, and catching
> contradictions. If this file exceeds ~80 lines or accumulates content about PRD structure,
> screen states, or validation, split that content into a focused sibling.

When a ticket reference (ISS-NNN) is provided, follow this procedure before writing PRD ACs.
If no ticket reference is provided, skip this section.

**Step 1 — Read the ticket**
Read `docs/issues/tickets/ISS-NNN.md`. If the file is not found, do not silently skip fidelity.
Ask the user whether to proceed in degraded mode or stop. If the user approves degraded mode,
add a `**Degraded: ticket not found**` warning to the Dependencies section. Otherwise block.

**Step 2 — Transcribe ticket ACs**
Transcribe each ticket AC faithfully into Given/When/Then. Do not paraphrase or reinterpret.
Preserve the ticket's scope, severity, and specificity exactly.

**Step 3 — Flag divergences**
If a PRD AC diverges from the ticket AC in scope, severity, or specificity, flag it in
the Dependencies section as `**Assumption (diverges from ticket AC):**` with an explanation.

**Step 4 — Verify convention citations**
When citing a value from a project conventions file, read `docs/CLAUDE.md` and confirm
the value is present. If `docs/CLAUDE.md` is missing, use the root CLAUDE.md as fallback.
Never assume a convention value without reading the file.

**Step 4a — Convention coverage scan**
After transcribing ticket ACs, read the "Must Follow" section of `docs/CLAUDE.md` (or root
`CLAUDE.md` as fallback). For each convention that applies to the feature's file-touch footprint
(e.g., source/installed sync for new skills, Skill References table for commands that load skills),
verify it is reflected in an AC or Dependency. If a relevant convention has no corresponding AC,
either add one or document in Dependencies why it does not apply.

**Step 5 — Contradiction check**
After all ACs are written, scan for pairs that make mutually exclusive claims.
If a contradiction is found, flag it in Dependencies before proceeding.

**Step 6 — Open-ended scope**
If the ticket uses open-ended language (e.g., "and any other relevant X"), enumerate the
concrete candidates OR ask the user which ones apply. Do not carry forward open-ended scope
into the PRD without resolution.
