# Requirements: Reject Multi-Artist Same-Name Album Output

## 1. Background

`organizeAlbumFiles` currently builds each output relative path as
`<artist>/<album>/<track> - <title>.<ext>`. It rejects duplicate file paths,
existing destination album directories, and existing destination files, but it
allows a single invocation to plan two distinct artist directories that have
the same album directory name, for example `Artist A/Greatest Hits` and
`Artist B/Greatest Hits`.

The operation is shared by the `manage-albums organize-files` CLI, the REST
`POST /manage-albums/organize-files` endpoint, the GraphQL
`albumOrganizeFiles` mutation, and the
`manage_albums_organize_files` MCP tool. The 2026-07-19 MCP and 2026-07-23
GraphQL/list specs established these as thin adapters over the domain service.

## 2. Goal

An organize-files invocation MUST fail as a single, deterministic user-input
error when its planned output contains one normalized album directory name for
multiple normalized artist directory names. The same error MUST be observable
from every public client, in both dry-run and `execute: true` modes, before any
destination inspection or file copy occurs.

## 3. Scope

### In scope

- `src/lib/albums/organize-files.ts` and, only if required to keep output-name
  normalization centralized, `src/lib/albums/organization-plan.ts`.
- CLI wording and command tests for `manage-albums organize-files`.
- REST controller/integration coverage and the relevant Bruno request.
- GraphQL resolver/integration coverage, GraphQL Bruno coverage, and
  `docs/graphql.md` error guidance.
- MCP handler/controller coverage, MCP Bruno coverage, and `docs/mcp-server.md`
  safety guidance.
- Focused operation documentation where it describes organize-files safety.

### Out of scope

- Changing the `<artist>/<album>/<track> - <title>.<ext>` output layout.
- Relaxing any existing duplicate-file, existing-destination, metadata, path,
  dry-run, or source-preservation safeguard.
- Adding an option to bypass, warn about, or auto-resolve this conflict.
- Changes to `fix-tags`, `validate`, audiobook operations, MCP transport,
  REST/GraphQL routes, request schemas, or GraphQL SDL.
- New dependencies or live audio-library processing.

## 4. Functional Requirements

- **FR-1** `organizeAlbumFiles` MUST derive each planned album identity from
  the same sanitized artist and album directory segments that it will use in
  the output path, after applying the selected artist filename strategy.
- **FR-2** If a non-empty plan contains one sanitized album directory segment
  associated with more than one distinct sanitized artist directory segment,
  `organizeAlbumFiles` MUST throw `UserInputError` before checking destination
  existence or copying any file.
- **FR-3** The error MUST be deterministic, identify the conflicting output
  album directory and every conflicting output artist directory, and MUST NOT
  reveal absolute source or destination paths.
- **FR-4** The rule MUST run for dry-run and `execute: true`; on failure both
  modes MUST return no organization rows and `execute: true` MUST create or
  copy no destination files or directories.
- **FR-5** Existing plans with a single normalized artist per normalized album,
  including multiple tracks of that album, MUST retain their current rows,
  destination layout, and execution behavior.
- **FR-6** The CLI MUST surface the domain error as its normal command failure;
  its description or help text MUST state the multi-artist same-name-album
  safeguard.
- **FR-7** The REST endpoint MUST continue to translate this `UserInputError`
  to its existing HTTP 400 JSON error contract without changing its route,
  request body, or root confinement.
- **FR-8** The GraphQL mutation MUST continue to translate this `UserInputError`
  to an error with code `BAD_USER_INPUT`, without changing its mutation name,
  input type, result type, or generated SDL.
- **FR-9** The MCP tool MUST return the existing MCP tool-error representation
  for the domain error, without changing its name, input schema, annotations,
  configured-root behavior, or dry-run default.
- **FR-10** CLI, REST, GraphQL, and MCP tests and Bruno requests MUST cover the
  same conflict fixture and assert their client-specific error contract; public
  documentation MUST describe the safeguard and that it is not bypassable.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST be
  run and reported issues MUST be fixed before the next edit. Whole-codebase
  `npm run lint` MUST be reserved for final verification after all TypeScript
  modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms; use `npm run <script>`
  or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Type safety and size** Changes MUST preserve strict TypeScript with
  no `any` or TypeScript-suppression escapes, and no produced source file MAY
  exceed 200 lines.
- **NFR-4 — Client parity** All four clients MUST delegate to the same domain
  rule; no client MAY reimplement or weaken conflict detection.
- **NFR-5 — Scope discipline** No production changes may be made outside the
  album organization service and CLI description; adapter source changes are
  allowed only if a test proves the existing error translation cannot preserve
  FR-7 through FR-9.
- **NFR-6 — No new dependencies** The change MUST use existing dependencies.

## 6. Acceptance Criteria

1. A two-file fixture that plans `Artist A/Same Album/...` and
   `Artist B/Same Album/...` fails in the domain test before destination
   existence checks or copy calls, for dry-run and `execute: true`.
2. A same-artist, multi-track fixture still produces the current successful
   plan and, when executed, copies its files.
3. CLI, REST, GraphQL, and MCP focused tests each assert their normal
   user-input error contract for the shared conflict fixture.
4. REST, GraphQL, and MCP Bruno requests assert the same error contract, and
   the relevant public documents describe the rule.
5. `npm run lint`, `npm run build`, and `npm test` exit 0.
