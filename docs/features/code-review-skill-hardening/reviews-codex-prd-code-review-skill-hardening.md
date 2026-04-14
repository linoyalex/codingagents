# PRD Review: code-review-skill-hardening
**Generated:** 2026-04-14T14:45:22Z

## Findings
- [HIGH] [Out of Scope / Ticket alignment] The PRD weakens the source ticket by dropping `ISS-039` AC4a as "redundant," but the cited replacement does not cover the same behavior. [ISS-042](/Users/linoy/projects/codingagents/docs/issues/tickets/ISS-042.md) adds "read `known_risks`" guidance during `/implement`; it does not require reproducing each reported finding before declaring it fixed, nor writing a failing test first for code defects. That means a distinct RCA-backed requirement from the ticket is being removed rather than translated, which risks repeating the "declared fixed without proving it" failure mode the ticket was created to address.
- [MEDIUM] [AC3] "Run the project's test suite (e.g., `node --test`, `npm test`)" is too ambiguous to be reliably executed or reviewed. This repo routinely uses targeted suites rather than one canonical test command, so the PRD needs to say how the reviewer chooses the right command set when there is no single project-wide entry point, when the full suite is too broad for the diff, or when multiple suites are required to cover touched areas.
- [MEDIUM] [Screen States / AC4] The PRD says screen states are "Not applicable," but this feature still has important reviewer workflow states that are currently unspecified. In particular, AC4 needs guidance for findings that cannot be safely reproduced in the current environment, are nondeterministic, or depend on unavailable tooling/permissions. Without those states, downstream architecture and tests will not know when the reviewer should downgrade to an open question, mark the finding as unverified, or stop the review.
- [LOW] [Document structure] The PRD starts with `## Feature:` instead of a top-level `#` heading. That breaks the repo's canonical generated-artifact structure and makes the document inconsistent with the timestamp convention used elsewhere.

## Missing States
- Empty: No touched schema files, no touched installable files, or no obvious test command for the diff.
- Error: Test command fails to start, reproduction command errors for environmental reasons, or drift-check command cannot map a touched file to an installed copy.
- Permission denied: Reviewer cannot reproduce a finding because the command needs credentials, network access, or local privileges not available in the review environment.
- Other relevant edge states: Nondeterministic findings that reproduce intermittently, and diffs where multiple targeted test suites are needed instead of one canonical "project test suite" command.

## Recommendation
- Needs clarification first
