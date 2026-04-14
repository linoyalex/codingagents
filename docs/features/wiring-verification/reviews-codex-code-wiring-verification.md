# Review: wiring-verification
**Generated:** 2026-04-14T00:15:09Z

## Findings
- [BLOCKING] [lib/wiring-check.js:68] Stage 1 is bypassable because any `## Skill References` heading suppresses the fail-closed check, even if the table is empty or stale. `parseSkillReferences()` returns `[]` whenever the section exists but has no data rows, and the Stage 1 tests only assert that listed `sourcePath`s exist; they never verify that the table matches the skills the command actually loads in its prose ([tests/node/command-skill-wiring.test.js:60], [tests/node/command-skill-wiring.test.js:92]). I verified the shipped helper returns `[]` for a command that says `Read .claude/skills/tdd/SKILL.md` but contains an empty `## Skill References` table, which means a drifted table can make the wiring test pass while the real loaded skill is never checked.
- [BLOCKING] [lib/wiring-check.js:113] Stage 2 also fails open for the registry side: any skill without `## Required Artifacts` is treated as `null`/skip, and the new tests explicitly bless that behavior for arbitrary skills instead of proving that every artifact-producing skill opts in ([tests/node/command-skill-wiring.test.js:116], [tests/node/command-skill-wiring.test.js:214]). The only mandatory registry assertion is for `skills/tdd/SKILL.md` ([tests/node/command-skill-wiring.test.js:148]). That recreates the defect class this feature is supposed to prevent: if a future skill starts requiring a named artifact but the author forgets to add the registry, the contract suite stays green and the command wiring is never checked.
- [MAJOR] [commands/implement.md:36] Phase 5 now tells the developer to write and verify integration tests in `tests/integration/` ([commands/implement.md:66]) and the TDD skill makes that artifact mandatory for every feature ([skills/tdd/SKILL.md:46], [skills/tdd/SKILL.md:76]), but the same command still says to read only `architecture.md` plus tests in `tests/contracts/` and `tests/e2e/` ([commands/implement.md:36]). The implementation phase is therefore instructed not to read the integration tests whose wiring it must satisfy. The new wiring tests only inspect the `## Output` section ([tests/node/command-skill-wiring.test.js:192]), so this contradiction is currently untested.
- [MINOR] [.claude/handoff.json:6] The committed Phase 4 handoff points the next phase at `tests/contracts/wiring-verification.test.ts` and `tests/e2e/wiring-verification.spec.ts`, but the branch actually adds `.js` files ([tests/contracts/wiring-verification.test.js:1], [tests/e2e/wiring-verification.spec.js:1]). Any consumer that trusts `relevant_files` gets nonexistent paths.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...feature/ISS-036-wiring-verification`.
- Reviewed `docs/issues/tickets/ISS-036.md` and the branch handoff at `.claude/handoff.json`.
- Ran in `/Users/linoy/projects/codingagents-036`:
  `node --test tests/node/command-skill-wiring.test.js`
- Ran in `/Users/linoy/projects/codingagents-036`:
  `node --test tests/integration/wiring-verification.integration.test.js`
- Ran in `/Users/linoy/projects/codingagents-036`:
  `node --test tests/contracts/wiring-verification.test.js tests/e2e/wiring-verification.spec.js`
- Reproduced the Stage 1 empty-table bypass with `node -e` against `lib/wiring-check.js`.
- Reproduced the Stage 2 missing-registry skip with `node -e` against `lib/wiring-check.js`.
