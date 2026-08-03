# Tasks: Replace Album Organization API Metadata Paths with Inline JSON

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively (NFR-2).
> - **No edits outside album set-metadata internals, REST/GraphQL/MCP organize
>   schemas/adapters, affected album tests/collections/docs/skill, generated
>   SDL, and this spec** (NFR-8). Stop and surface required scope expansion.
> - After **every** TypeScript source or test file modification, run
>   `npm run lint -- <modified-file>` and fix all findings before moving on
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Never modify repository source audio, images, or existing destination
>   media during tests or smoke checks (FR-12).
> - Mark each matching `- [x]` checkbox **immediately** when its task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture baseline and contracts

- [x] Record `git status --short` and preserve unrelated user changes.
- [x] Do not run whole-codebase lint during pre-flight.
- [x] Run `npm test` and record baseline file/test counts and failures.
- [x] Capture current CLI, REST, GraphQL SDL, and MCP `setMetadata` string contracts and adapter mappings.
- [x] Inventory active schemas, conflicts, tests, collections, docs, and host-path guidance across all surfaces.
- [x] Record relevant source/test line counts; plan extraction before modifying files near 200 lines.

> Pre-flight note: the worktree contained only this untracked spec. Baseline
> `npm test` passed 55 files / 258 tests. CLI, REST, GraphQL, and MCP all mapped
> `setMetadata` strings to the domain filepath option; generated SDL exposed
> `setMetadata: String`. The set-metadata helper was 198 lines, so record
> normalization/reconciliation will be extracted before behavior is added.

## Phase 2 — Shared inline record input

### 2.1 Extract canonical record validation

- [x] Extract record construction, validation, duplicate detection, and reconciliation into a focused helper without changing CLI filepath behavior.
- [x] Preserve JSON/CSV parsing errors, numeric coercion, extra-column behavior, exact filename matching, and whole-selection coverage (FR-3, FR-4, FR-8).
- [x] Add or preserve helper tests for valid JSON/CSV and empty, malformed, duplicate, unknown, missing, unsafe filename, and invalid disc/track cases.
- [x] Run `npm run lint -- <modified-file>` after every TypeScript edit; fix and rerun until clean.

### 2.2 Add a distinct internal record source

- [x] Add `setMetadataRecords` while retaining CLI's existing `setMetadata` filepath option (FR-5, FR-8).
- [x] Apply existing conflicts to either source and reject simultaneous filepath and inline inputs (FR-6).
- [x] Route records directly to reconciliation without path resolution, file reads, or temporary manifests (FR-7, NFR-9).
- [x] Prove equivalent file and record inputs produce identical plans, tag changes, and executed destination metadata.
- [x] Prove every record validation/reconciliation failure precedes all writes.
- [x] Run per-file lint immediately after every modified TypeScript file.

> Phase 2 note: record normalization/reconciliation now lives in a focused
> helper; the original file parser is 42 lines. Equivalent filepath and inline
> dry runs plus conflict/no-write cases passed 14 focused tests.

## Phase 3 — REST and MCP contracts

### 3.1 Replace REST input and mapping

- [x] Replace REST `setMetadata: string` with the non-empty native record-array schema (FR-1–FR-3).
- [x] Map REST records to internal `setMetadataRecords`; never populate the filepath option.
- [x] Assert valid mapping plus string, encoded JSON, empty, malformed, unsafe filename, and disc relationship failures with HTTP 400 behavior (FR-7, FR-9).
- [x] Cover both omitted/false and true `execute`, including source preservation and preflight-no-write behavior.
- [x] Run per-file lint immediately after every modified TypeScript file/test.

### 3.2 Replace MCP input and mapping

- [x] Replace MCP `setMetadata: string` with the equivalent nested record-array schema and map it to `setMetadataRecords`.
- [x] Assert `tools/list` exposes array/items/required/native-number fields (FR-11).
- [x] Assert invalid arguments fail before the domain call and valid records remain in memory.
- [x] Preserve tool name/order, annotations, configured roots, other inputs, and tool-error translation.
- [x] Split focused tests rather than taking existing files above 200 lines.
- [x] Run per-file lint immediately after every modified TypeScript file/test.

## Phase 4 — GraphQL contract

### 4.1 Add the typed record input

- [x] Add `AlbumSetMetadataRecordInput` and change `AlbumOrganizeFilesInput.setMetadata` from `String` to its list type (FR-10).
- [x] Map the list to `setMetadataRecords` and validate empty lists, positive integers, filenames, and disc relationships before organization.
- [x] Preserve every unrelated input/output field, resolver root behavior, dry-run default, and `BAD_USER_INPUT` translation.
- [x] Regenerate `schema.gql` and review the exact expected semantic delta.
- [x] Run per-file lint immediately after every modified TypeScript file.

### 4.2 Lock GraphQL dry-run and execution behavior

- [x] Add resolver and HTTP integration coverage for valid inline whole-album dry run and `execute: true` requests.
- [x] Assert effective rows/destinations, destination-only tag repair, and source preservation.
- [x] Assert string/shape coercion failures plus empty, partial, duplicate, unknown, and invalid record failures produce no writes.
- [x] Run per-file lint immediately after every modified TypeScript test.

## Phase 5 — Cross-surface behavior and CLI parity

### 5.1 Exercise whole-album API repair

- [x] Use isolated REST, GraphQL, and MCP fixtures with complete records for every selected audio file.
- [x] Include Requiem-style incorrect/repeated and missing metadata; assign unique effective tracks and complete required fields in one request (FR-4, FR-5).
- [x] Require equivalent effective metadata, destinations, ordering, and errors across all APIs.
- [x] Keep fixtures temporary or in isolated configured roots; do not use `etc/**` media.
- [x] Run per-file lint immediately after every modified TypeScript test.

### 5.2 Preserve CLI filepath execution

- [x] Preserve `--set-metadata <json-or-csv-path>` registration and mapping unchanged (FR-8).
- [x] Run JSON and CSV filepath dry-run and `--execute` regressions, including metadata verification and source preservation.
- [x] Assert API record work does not add an inline CLI option or remove filepath error behavior.
- [x] Run per-file lint after any required CLI test edit.

## Phase 6 — Collections and guidance

### 6.1 Update safe API smoke requests

- [x] Update affected REST, GraphQL, and MCP organize requests to send complete inline arrays/lists against isolated fixtures.
- [x] Update MCP tools-list and GraphQL schema assertions for their nested record types.
- [x] Keep collections dry-run-only and preserve traversal, root override, invalid input, and conflict coverage.

### 6.2 Update active documentation and skill

- [x] Document inline REST, GraphQL, and MCP examples plus the unchanged CLI filepath example (FR-13).
- [x] Remove API host-path guidance from `docs/album-organization.md`, `docs/graphql.md`, `docs/mcp-server.md`, and `docs/organize-files-set-metadata.md`.
- [x] Update `.agents/skills/album-organization/SKILL.md` to construct complete API record arrays while retaining CLI file guidance.
- [x] Update `docs/testing.md` only if focused test inventory changes; leave historical specs unchanged.

> Implementation note: REST, GraphQL, and MCP share a 35-record Requiem-style
> fixture at their adapter/protocol boundaries. Focused domain execution proves
> inline and file-backed records write identical destination metadata while
> source bytes remain unchanged. Three isolated dry-run Bruno requests exercise
> the new API bodies.

## Phase 7 — Verification

### 7.1 Run focused regression tests

- [x] Run every focused Vitest command from `design.md` §9 directly with `./node_modules/.bin/vitest run`; require exit 0.
- [x] Confirm coverage includes shared validation, all API mappings, dry run, REST/GraphQL execution, source safety, error parity, and CLI filepath parity.

### 7.2 Run final repository checks

- [x] Run whole-codebase `npm run lint` only now; require exit 0.
- [x] Run `npm run build`; require exit 0.
- [x] Run `npm test`; require exit 0 and compare counts with Phase 1.
- [x] Confirm every touched source/test file is at most 200 lines.
- [x] Review and retain only the intended generated GraphQL SDL delta.
- [x] Confirm `git diff -- package.json package-lock.json` and `git status --short -- etc` are empty.
- [x] Run `git diff --check`; require exit 0.

### 7.3 Verify dry-run API transports

- [x] Start the built server with isolated configured roots and retain its process/session identifier.
- [x] Run only affected REST, GraphQL, and MCP dry-run Bruno requests; require all requests and assertions to pass.
- [x] Stop the captured server in all cases and confirm source, destination, and scratch roots are unchanged.

### 7.4 Audit scope and record results

- [x] Review the final diff for API string compatibility, arbitrary host reads, temporary manifests, partial coverage, CLI drift, execute-default changes, or source mutation.
- [x] Confirm the final diff matches `design.md` §2 and contains no audiobook, dependency, root-configuration, historical-spec, or real-media edits.
- [x] Add concise blockquoted execution notes with baseline/final counts, focused tests, SDL result, Bruno result, deviations, and blockers.

> Verification note: all four focused commands passed (4 files / 22 tests,
> 2 / 8, 2 / 12, and 2 / 13). Final lint and build passed; the full suite
> increased from 55 files / 258 tests to 58 files / 270 tests, all passing.
> Generated SDL changed only `setMetadata` to the typed list and added
> `AlbumSetMetadataRecordInput`. The isolated Bruno run passed 3/3 REST,
> GraphQL, and MCP dry-run requests; destination and scratch stayed empty and
> the copied source was unchanged. No deviations or blockers remain.
