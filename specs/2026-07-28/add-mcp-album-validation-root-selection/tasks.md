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

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Reconfirm the validate schema/adapter, `resolveSource` and
      `resolveScratch` contracts, existing MCP test helpers, and Bruno scratch
      marker setup.
- [ ] Record the line count of
      `__tests__/web/mcp.manage-albums-operations.test.ts`; plan the focused
      split before edits if required by NFR-6.
- [ ] Run the focused MCP operations test from `design.md` section 9 and
      record its baseline pass count.
- [ ] Do not run whole-codebase `npm run lint` during pre-flight.

## Phase 2 — Focused MCP specification

### 2.1 Add routing and option-mapping coverage

- [ ] Extend the focused MCP operations test for omitted/false source routing,
      true scratch routing, and the exact unchanged domain call object
      (FR-2, FR-4, FR-6).
- [ ] Assert `useScratchDir` is absent from the domain options.
- [ ] Split validate cases into
      `__tests__/web/mcp.manage-albums-validate.test.ts` first if the existing
      file would exceed 200 lines.
- [ ] After every TypeScript test edit, run
      `npm run lint -- <modified-test-file>` and fix all reported issues.

### 2.2 Add rejection and discovery coverage

- [ ] Assert non-boolean `useScratchDir` fails before path resolution or
      `validateAlbumSourceDir` invocation (FR-5).
- [ ] Assert source traversal reports `--source-dir` and true scratch
      traversal reports `--scratch-dir`, with no domain invocation (FR-3).
- [ ] Assert discovery exposes optional Boolean `useScratchDir` and retains
      `readOnlyHint: true` (FR-1, FR-7).
- [ ] Preserve successful row and multi-artist tool-error regression coverage.
- [ ] Lint each modified TypeScript test file immediately after every edit.

## Phase 3 — MCP schema and adapter

### 3.1 Add the optional schema property

- [ ] Add `useScratchDir: z.boolean().optional()` to
      `manageAlbumsValidateInputSchema` (FR-1).
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts` immediately;
      fix and rerun until clean.

### 3.2 Route validation through the selected root

- [ ] Update the validate handler to call `resolveScratch` only for exact true
      and `resolveSource` for omitted/false (FR-2, FR-3).
- [ ] Keep the selector out of `validateAlbumSourceDir` and preserve every
      existing optional mapping and JSON result path (FR-4, FR-6).
- [ ] Update the tool description to mention configured source or scratch
      validation while retaining its name, title, and read-only annotation
      (FR-7, FR-8).
- [ ] Run `npm run lint --
      src/web/servers/mcp-tools/manage-albums/validate.ts` immediately after
      every edit; fix and rerun until clean.
- [ ] Run all focused MCP tests from `design.md` section 9; exit 0.

## Phase 4 — Bruno validation collection

### 4.1 Add safe scratch-root calls

- [ ] Keep the existing omitted-selector source validation request unchanged.
- [ ] Add `call-manage-albums-validate-scratch.yml` using the existing scratch
      marker, `useScratchDir: true`, and `limit: 0`; assert successful JSON
      array tool content (FR-10).
- [ ] Add `call-manage-albums-validate-scratch-path-traversal.yml`; assert
      tool-error content includes `--scratch-dir` (FR-3, FR-10).
- [ ] Confirm every validation request remains read-only and has no execute
      input.

### 4.2 Assert the public discovery contract

- [ ] Extend `mcp/tools-list.yml` to find `manage_albums_validate` and assert
      optional Boolean `useScratchDir` plus `readOnlyHint: true`.
- [ ] Preserve the existing deterministic tool-name ordering assertion.

## Phase 5 — Documentation

### 5.1 Document validation root selection

- [ ] Update `docs/mcp-server.md` with omitted/false source behavior, true
      scratch behavior, and the no-client-root boundary (FR-8).
- [ ] State that validation remains read-only and that selected-root traversal
      is rejected before metadata validation.

## Phase 6 — Verification

### 6.1 Run focused and full checks

- [ ] Re-run all focused Vitest commands from `design.md` section 9; exit 0.
- [ ] `npm run lint` — final whole-codebase lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0 with the baseline plus documented additions.

### 6.2 Run live MCP validation checks

- [ ] Create the documented temporary scratch root and `scratch-only/` marker.
- [ ] Start `npm run web:serve` with the documented source, destination, and
      captured scratch roots; retain the exact server PID.
- [ ] Run the affected Bruno command from `design.md` section 9; all source,
      scratch, and traversal assertions pass.
- [ ] Stop the captured server process and remove only the known marker and
      known empty temporary scratch root with `rmdir`.

### 6.3 Audit scope and behavior

- [ ] Run both scope commands from `design.md` section 9 and confirm they are
      empty (NFR-7, NFR-8).
- [ ] Confirm the final diff contains only `design.md` section 2 files plus
      this spec directory.
- [ ] Confirm CLI, REST, GraphQL, shared validation behavior, configured roots,
      and other MCP tools are unchanged.
