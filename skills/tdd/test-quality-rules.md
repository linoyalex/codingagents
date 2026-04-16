# Test Quality Rules

**Purpose boundary:** This file covers test *selection and strategy* rules — which test pattern to use and which components to cover. Test execution procedures (TDD cycle, commit protocol) stay in SKILL.md. Split into focused siblings if this file exceeds ~80 lines or gains off-purpose content.

## Symmetric Coverage

When the architecture explicitly enumerates a set of components (e.g., "5 subsections", "3 artifact types", "N pipeline phases"), every enumerated component must have at least one test. Partial coverage of an explicit list is a common gap — if the spec says N, test N.

Do not apply this rule when the architecture does not explicitly enumerate components.

## Contract Robustness

For each safety invariant or hard constraint, verify that the invariant cannot be trivially evaded. A contract that passes when the enforcing code is commented out, replaced with a no-op, or bypassed via an undocumented escape hatch is not meaningfully tested.

Write at least one adversarial test per contract that attempts trivial evasion and asserts failure.

## Structural vs Fixture-Driven Testing

Choose your test approach based on the artifact type:

- **Structural tests** (for declarative artifacts like markdown, templates, schemas): assert on headings, required sections, field presence, and structural relationships. These verify that the artifact has the right shape without coupling to specific wording.
- **Fixture-driven tests** (for executable or behavioral artifacts like scripts, hooks, modules): run the code with known inputs and assert on outputs, exit codes, and side effects. These verify what the artifact does, not what it says.

When in doubt, prefer behavioral/fixture-driven tests — they catch real bugs. Use structural tests only when the artifact's structure *is* the contract (e.g., a markdown skill file whose headings are consumed by other tools).

## Artifact-Type Test Strategy

Route test strategy based on artifact type. Adapt to your stack — the examples below use `node --test` and `pytest` but the patterns apply to any toolchain.

| Artifact type | Test approach | Example tools |
|---|---|---|
| Declarative (markdown, templates) | Structural assertions: headings, sections, field presence | `node --test` with `fs.readFileSync` + regex, `pytest` with file reads |
| Executable (shell scripts, JS modules, hooks) | Behavioral assertions: run with fixtures, assert output/exit code | `node --test` with `child_process.execSync`, `pytest` with `subprocess.run` |
| Config (JSON schemas, settings, YAML) | Schema validation + constraint assertions: required fields, types, rejection of invalid input | `node --test` with `ajv` or `JSON.parse`, `pytest` with `jsonschema` |
| Hybrid (executable + declarative) | Executable strategy takes precedence — behavioral correctness outranks structural presence | Combine both: behavioral tests first, structural spot-checks second |
