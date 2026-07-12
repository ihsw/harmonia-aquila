# Design: Nest Album Commands

> Scope reminder: this spec touches **only** `src/index.ts`. No edits to
> `src/commands/**`, `package.json`, or dependency lockfiles; no new
> dependencies and no `npx`.

## 1. Overview

Use Commander’s existing nested-command model: create one child command from
the root `program`, then pass that child to each existing registration
function. This is a thin registration-adapter change, satisfying FR-1 and
FR-2 while retaining the command modules and their local option/action
closures unchanged under FR-3.

The direct root registrations are replaced rather than duplicated. This
deliberately makes the new hierarchy the only public invocation path (FR-4)
and avoids ambiguous help output or two independently supported command
surfaces. Root program identity remains untouched (FR-5).

## 2. File layout

### Modified files

```text
src/index.ts    (rewritten, approximately 5 added and 3 replaced lines)
```

### Files explicitly NOT modified

- `src/commands/summarize-source-dir.ts` retains its command definition and handler.
- `src/commands/fix-tags.ts` retains its command definition and handler.
- `src/commands/organize-files.ts` retains its command definition and handler.
- `package.json` retains the existing scripts and dependencies.

## 3. Command registration

Create the parent after configuring the root program and pass it into the
existing registration functions:

```ts
const manageAlbumsCommand = program
  .command('manage-albums')
  .description('Manage album files')

registerSummarizeSourceDirCommand(manageAlbumsCommand)
registerFixTagsCommand(manageAlbumsCommand)
registerOrganizeFilesCommand(manageAlbumsCommand)
```

No command module changes are required: each function already accepts a
Commander `Command` and registers a child through `.command(...)`.

| File | Current registration target | New registration target |
| ---- | --------------------------- | ----------------------- |
| `src/index.ts` | `program` | `manageAlbumsCommand` |
| `src/commands/summarize-source-dir.ts` | supplied `Command` | unchanged |
| `src/commands/fix-tags.ts` | supplied `Command` | unchanged |
| `src/commands/organize-files.ts` | supplied `Command` | unchanged |

## 4. Command-path migration

| Current invocation | Replacement |
| ------------------ | ----------- |
| `harmonia-aquila summarize-source-dir ...` | `harmonia-aquila manage-albums summarize-source-dir ...` |
| `harmonia-aquila fix-tags ...` | `harmonia-aquila manage-albums fix-tags ...` |
| `harmonia-aquila organize-files ...` | `harmonia-aquila manage-albums organize-files ...` |

This is an intentional breaking CLI-path change. Do not add aliases,
forwarding commands, deprecation warnings, or duplicate registrations; those
would contradict FR-4 and create an additional supported interface.

## 5. Test updates

No automated test suite exists (`npm test` is a placeholder that exits
non-zero), so this change adds no test files or framework. Verification uses
the built CLI help surface, which exercises Commander’s nested registration.

| Check | Expected result |
| ----- | --------------- |
| `manage-albums --help` | Lists the three subcommands |
| Nested subcommand help | Shows existing command options |
| Root-level subcommand invocation | Fails as an unknown command |

## 6. Migration strategy

1. Run the existing lint and build commands to establish the baseline.
2. Update only `src/index.ts` using the registration pattern in §3.
3. Run lint immediately after that edit, then build the distribution.
4. Execute the checks in §5 against `build/dist/index.js`.
5. Confirm the forbidden paths in NFR-4 are unchanged.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| A command is accidentally registered on both levels | Low | Replace, rather than add to, the three root registrations. |
| Options or actions change during nesting | Low | Do not modify the command modules; smoke-check each nested help page. |
| Consumers use the old command path | Medium | Make the intentional breaking migration explicit in §4 and FR-4. |

## 8. Verification

1. `npm run lint` — must exit 0 after the sole source edit (NFR-1).
2. `npm run build` — must exit 0 (NFR-2).
3. `node build/dist/index.js manage-albums --help` — must list all three subcommands.
4. `node build/dist/index.js manage-albums summarize-source-dir --help`,
   `node build/dist/index.js manage-albums fix-tags --help`, and
   `node build/dist/index.js manage-albums organize-files --help` — each
   must display its existing options.
5. `node build/dist/index.js summarize-source-dir` — must fail as an
   unknown command (FR-4).
6. `git --no-pager diff --stat src/commands package.json package-lock.json`
   — must be empty (NFR-4).
