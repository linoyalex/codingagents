# Release Process

This document is the canonical release-process guide for `codingagents` until the full `ISS-030` semver automation lands.

## Canonical version line

- Major version `5` begins with the `version5-codex+token-governance` line.
- Treat that line as the `5.0.0` generation baseline.
- The repo currently uses the following canonical `5.x` mapping for published artifacts:

| Transitional label | Canonical label | Primary work |
|---|---|---|
| `0.5.0` | `5.1.0` | `ISS-010` core reliability refresh |
| `0.6.0` | `5.1.1` | `ISS-009` fail-closed feature resolution |
| `0.7.0` | `5.2.0` | `ISS-026` artifact timestamps |
| `0.8.0` | `5.3.0` | `ISS-013` skill size convention |
| `0.9.0` | `5.4.0` | `ISS-022` integration test coverage |
| `1.0.0` | `5.5.0` | `ISS-024`, `ISS-014`, `ISS-033` review layer hardening |

Current published release: `5.5.0`.

Some canonical `5.1.x` artifacts preserve the dates from when that work was authored on the v5 branch line, so the historical dates do not map perfectly to the later normalized `5.0.0` baseline entry. This is intentional and should be documented rather than hidden.

## Choosing major, minor, or patch

- **Patch**
  - Use for backward-compatible bug fixes that restore intended behavior.
  - Typical examples: regression fixes, installer omissions, sync-drift fixes, missing guards.
- **Minor**
  - Use for backward-compatible framework capabilities or workflow changes within the same major line.
  - Typical examples: new artifact types, new review surfaces, stronger gates, new commands, new required checks.
- **Major**
  - Use when the framework contract changes enough that existing in-flight work or installed projects require coordinated migration.
  - Typical examples: handoff schema resets, incompatible command contracts, install path rewrites, or a new framework mental model.

## Interim manual heuristic

Until `/specify` and backlog metadata are semver-aware, maintainers should manually answer these questions for each ticket or grouped release:

1. Does this change alter command contracts, handoff schema, install/upgrade behavior, required artifacts, or phase/gate behavior?
2. Is the work restoring an existing contract, or introducing a new operator-facing capability?
3. Would upgrading in the middle of an active feature cycle risk invalidating in-flight artifacts or handoffs?

Default decision rule:

- If restoring expected behavior, choose `patch`.
- If adding capability or a new gate within the same framework generation, choose `minor`.
- If coordinated migration is required, choose `major`.

## Working with in-progress tickets

Until the backlog is machine-readable for semver, group open tickets into coherent release bundles manually.

Recommended current roadmap:

| Target version | Planned scope |
|---|---|
| `5.6.0` | `ISS-036`, `ISS-027`, `ISS-029` — command/skill correctness bundle |
| `5.7.0` | `ISS-001`, `ISS-006`, `ISS-037` — invariants and review-traceability bundle |
| `5.8.0` | `ISS-028`, `ISS-032`, optionally `ISS-031` — workflow ergonomics bundle |
| `5.9.0` | `ISS-007`, `ISS-008`, `ISS-030` — install and release-management bundle |

Patch rule:

- If a regression is discovered after a `5.x.0` release is published, fix it in `5.x.1`.
- If the bug fix is discovered before the planned minor release ships, fold it into that unreleased minor instead of cutting a separate patch.

## Upgrade safety

Upgrading agents in the middle of an active feature cycle is strongly discouraged when a release changes:

- required gates
- required artifact types
- handoff schema
- command invocation contracts
- install/upgrade behavior

For these releases, `README.md`, `QUICKSTART.md`, and the release note must explain:

- what changed
- why in-flight work may fail after upgrade
- how to recover safely

Default recovery guidance:

1. Finish the current feature before upgrading, if possible.
2. If already upgraded, run `/status` first.
3. Re-run from the last stable phase whose outputs satisfy the new gate or contract.
4. Regenerate artifacts rather than trying to force old outputs through new gates.

Current example: `5.5.0` introduces a required `source_spec` handoff field and new gate role requirements. In-flight phases may need handoff updates before re-review.

## Manual release checklist

For each published release until automation lands:

1. Choose the target version and record the semver rationale.
2. Update `CHANGELOG.md`.
3. Create or update the matching file in `release-notes/`.
4. Update `README.md` and `QUICKSTART.md` if the release changes operator-visible behavior.
5. Add an explicit upgrade warning if the release changes gates, schemas, command contracts, or required artifacts.
6. If transitional numbering is involved, preserve the compatibility map in this document.

## Future automation target

`ISS-030` should eventually make the following automatic or machine-checked:

- semver proposal during `/specify`
- release-impact metadata in tickets/backlog
- consistency between release notes, changelog, and target version
- upgrade-warning requirements for workflow-breaking releases
