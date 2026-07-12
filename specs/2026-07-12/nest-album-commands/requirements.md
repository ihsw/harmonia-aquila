# Requirements: Nest Album Commands

## 1. Background

`src/index.ts` currently registers `summarize-source-dir`, `fix-tags`, and
`organize-files` directly on the root Commander program. These commands all
operate on album files, but their relationship is not represented in the CLI
help or invocation hierarchy.

The CLI needs one `manage-albums` parent command that groups the existing
album-management operations without changing their handlers, arguments,
options, validation, output, or file behavior.

## 2. Goal

After the change, album operations are invoked as
`harmonia-aquila manage-albums <subcommand>`. The three existing operations
remain available under that parent with their current behavior; their former
root-level invocations are intentionally removed.

## 3. Scope

### In scope

- `src/index.ts` command registration and root CLI help.
- The `manage-albums` parent command and its description.
- Nesting `summarize-source-dir`, `fix-tags`, and `organize-files`.
- Build, lint, and CLI help smoke checks.

### Out of scope

- Changes to `src/commands/**` handlers, options, validation, output formats,
  or filesystem behavior.
- Backward-compatible aliases for root-level command names.
- New dependencies, a test framework, or changes to `package.json`.
- Documentation beyond Commander-generated CLI help.

## 4. Functional Requirements

- **FR-1** The root program MUST register a `manage-albums` command with a
  description that identifies it as the parent for album-management commands.
- **FR-2** `summarize-source-dir`, `fix-tags`, and `organize-files` MUST be
  registered on `manage-albums`, so each is listed by
  `harmonia-aquila manage-albums --help`.
- **FR-3** Each nested command MUST retain its current name, required and
  optional arguments, default values, validation behavior, action handler,
  output shape, and dry-run/execute semantics.
- **FR-4** The former root-level commands MUST no longer be registered; users
  MUST invoke their replacements through `manage-albums`.
- **FR-5** The root program's name and description MUST remain
  `harmonia-aquila` and `Analyze local music files`, respectively.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every file modification)** After every source-file
  modification, `npm run lint` MUST run and all reported issues MUST be fixed
  before continuing.
- **NFR-2 (build)** `npm run build` MUST exit 0 after implementation.
- **NFR-3 (no `npx`)** `npx` is forbidden in all forms; commands MUST use
  `npm run <script>` or an existing project binary.
- **NFR-4 (scope discipline)** Only `src/index.ts` MAY be modified; `src/commands/**`,
  `package.json`, and dependency lockfiles MUST remain unchanged.
- **NFR-5 (behavioral parity)** Aside from the command path in FR-2 and the
  intentional removal in FR-4, command behavior MUST remain unchanged.
- **NFR-6 (test baseline)** The current `npm test` script intentionally exits
  non-zero because no test suite exists; implementation MUST NOT alter that
  script merely to satisfy verification.

## 6. Acceptance Criteria

1. `node build/dist/index.js manage-albums --help` lists all three existing
   subcommands.
2. `node build/dist/index.js manage-albums summarize-source-dir --help`,
   `fix-tags --help`, and `organize-files --help` show their current options.
3. `node build/dist/index.js summarize-source-dir` exits non-zero and reports
   the root-level command as unknown.
4. `npm run lint` and `npm run build` exit 0.
5. `git --no-pager diff --stat src/commands package.json package-lock.json`
   is empty.
