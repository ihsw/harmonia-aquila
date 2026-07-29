# Tasks: Add MCP Album Validation Root Selection

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the files listed in `design.md` section 2 (NFR-8).
>   Stop and surface any genuinely required scope expansion.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix every issue before the next edit
>   (NFR-1). Lint only that file, per edit and not merely per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; never use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm contracts and baseline

- [x] Record `git status --short` and preserve all pre-existing changes.
- [x] Reconfirm the validate schema/adapter, `resolveSource` and
      `resolveScratch` contracts, existing MCP test helpers, and Bruno scratch
      marker setup.
- [x] Record the line count of
      `__tests__/web/mcp.manage-albums-operations.test.ts`; plan the focused
      split before edits if required by NFR-6.
- [x] Run the focused MCP operations test from `design.md` section 9 and
      record its baseline pass count.
- [x] Do not run whole-codebase `npm run lint` during pre-flight.

> Baseline: `mcp.manage-albums-operations.test.ts` was 172 lines and passed
> 5 tests. Validation cases will move to a focused file before new coverage.

## Phase 2 — Focused MCP specification

### 2.1 Add routing and option-mapping coverage

- [x] Extend the focused MCP operations test for omitted/false source routing,
      true scratch routing, and the exact unchanged domain call object
      (FR-2, FR-4, FR-6).
- [x] Assert `useScratchDir` is absent from the domain options.
- [x] Split validate cases into
      `__tests__/web/mcp.manage-albums-validate.test.ts` first if the existing
      file would exceed 200 lines.
- [x] After every TypeScript test edit, run
      `npm run lint -- <modified-test-file>` and fix all reported issues.

### 2.2 Add rejection and discovery coverage

- [x] Assert non-boolean `useScratchDir` fails before path resolution or
      `validateAlbumSourceDir` invocation (FR-5).
- [x] Assert source traversal reports `--source-dir` and true scratch
      traversal reports `--scratch-dir`, with no domain invocation (FR-3).
- [x] Assert discovery exposes optional Boolean `useScratchDir` and retains
      `readOnlyHint: true` (FR-1, FR-7).
- [x] Preserve successful row and multi-artist tool-error regression coverage.
- [x] Lint each modified TypeScript test file immediately after every edit.

## Phase 3 — MCP schema and adapter

### 3.1 Add the optional schema property

- [x] Add `useScratchDir: z.boolean().optional()` to
      `manageAlbumsValidateInputSchema` (FR-1).
- [x] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts` immediately;
      fix and rerun until clean.

### 3.2 Route validation through the selected root

- [x] Update the validate handler to call `resolveScratch` only for exact true
      and `resolveSource` for omitted/false (FR-2, FR-3).
- [x] Keep the selector out of `validateAlbumSourceDir` and preserve every
      existing optional mapping and JSON result path (FR-4, FR-6).
- [x] Update the tool description to mention configured source or scratch
      validation while retaining its name, title, and read-only annotation
      (FR-7, FR-8).
- [x] Run `npm run lint --
      src/web/servers/mcp-tools/manage-albums/validate.ts` immediately after
      every edit; fix and rerun until clean.
- [x] Run all focused MCP tests from `design.md` section 9; exit 0.

> Focused result: 2 files and 8 tests passed.

## Phase 4 — Bruno validation collection

### 4.1 Add safe scratch-root calls

- [x] Keep the existing omitted-selector source validation request unchanged.
- [x] Add `call-manage-albums-validate-scratch.yml` using the existing scratch
      marker, `useScratchDir: true`, and `limit: 0`; assert successful JSON
      array tool content (FR-10).
- [x] Add `call-manage-albums-validate-scratch-path-traversal.yml`; assert
      tool-error content includes `--scratch-dir` (FR-3, FR-10).
- [x] Confirm every validation request remains read-only and has no execute
      input.

### 4.2 Assert the public discovery contract

- [x] Extend `mcp/tools-list.yml` to find `manage_albums_validate` and assert
      optional Boolean `useScratchDir` plus `readOnlyHint: true`.
- [x] Preserve the existing deterministic tool-name ordering assertion.

## Phase 5 — Documentation

### 5.1 Document validation root selection

- [x] Update `docs/mcp-server.md` with omitted/false source behavior, true
      scratch behavior, and the no-client-root boundary (FR-8).
- [x] State that validation remains read-only and that selected-root traversal
      is rejected before metadata validation.

## Phase 6 — Verification

### 6.1 Run focused and full checks

- [x] Re-run all focused Vitest commands from `design.md` section 9; exit 0.
- [x] `npm run lint` — final whole-codebase lint after all TypeScript
      modifications are complete; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0 with the baseline plus documented additions.

> Final results: focused MCP 8/8, full suite 196/196 across 40 files, lint
> clean, and TypeScript build successful.

### 6.2 Run live MCP validation checks

- [x] Create the documented temporary scratch root and `scratch-only/` marker.
- [x] Start `npm run web:serve` with the documented source, destination, and
      captured scratch roots; retain the exact server PID.
- [x] Run the affected Bruno command from `design.md` section 9; all source,
      scratch, and traversal assertions pass.
- [x] Stop the captured server process and remove only the known marker and
      known empty temporary scratch root with `rmdir`.

> Live result: MCP collection 21/21 requests, 40/40 tests, and 21/21
> assertions passed. The captured server and temporary root were removed.

### 6.3 Audit scope and behavior

- [x] Run both scope commands from `design.md` section 9 and confirm they are
      empty (NFR-7, NFR-8).
- [x] Confirm the final diff contains only `design.md` section 2 files plus
      this spec directory.
- [x] Confirm CLI, REST, GraphQL, shared validation behavior, configured roots,
      and other MCP tools are unchanged.
