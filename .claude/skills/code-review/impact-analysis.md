## Schema Impact Tracing

When the diff adds, removes, or renames a required field in any schema file (JSON Schema, TypeScript interface, Zod schema, Python dataclass, or equivalent), trace the change through all producers and consumers of that schema.

### Procedure

1. Identify every schema-touching change in the diff (new field, removed field, renamed field, type change).
2. For each change, grep for all producers (code that writes/creates instances of the schema) and consumers (code that reads/validates against it). Adapt the command to your stack:
   ```bash
   # Example — adapt to your project's language and tooling
   grep -rn "handoff" --include="*.js" --include="*.ts" --include="*.py"
   ```
3. For each producer/consumer pair, verify the code handles the schema change correctly.
4. List each pair with a pass/fail assessment in the review findings.

### What to flag

- A consumer that reads a removed or renamed field without a fallback.
- A producer that omits a newly required field.
- A validator that enforces constraints the schema no longer requires (or vice versa).

If no schema files are touched in the diff, skip this check with a note: "No schema changes in diff — schema impact tracing skipped."
