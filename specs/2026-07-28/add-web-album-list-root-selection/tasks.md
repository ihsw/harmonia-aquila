# Tasks: Add Web Album List Root Selection

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the files listed in `design.md` section 2 (NFR-8).
>   Stop and surface any required scope expansion; do not patch it silently.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix all issues before moving on
>   (NFR-1). Lint only that file, per edit and not merely per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; never use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm contracts and baseline

- [ ] Inspect dirty-worktree state and preserve the unrelated untracked `.ai/`
      directory.
- [ ] Reconfirm current REST query parsing, GraphQL input/SDL generation, MCP
      registration, and `useScratchDir` conventions from `design.md`.
- [ ] Run the three focused Vitest commands from `design.md` section 9 and
      record baseline pass/fail counts.
- [ ] Do not run whole-codebase `npm run lint` during pre-flight.

## Phase 2 — REST adapter

### 2.1 Specify source-or-scratch query behavior

- [ ] Extend `__tests__/web/controllers.test.ts` for omitted/false source,
      true scratch, scratch-plus-prefix, and invalid/repeated selector cases.
- [ ] Run `npm run lint -- __tests__/web/controllers.test.ts` after every edit
      and fix all reported issues.

### 2.2 Implement REST root selection

- [ ] Add optional query-boolean parsing to
      `src/web/schemas/request-schemas.ts` (FR-1, FR-6).
- [ ] Run `npm run lint -- src/web/schemas/request-schemas.ts` after every
      edit and fix all reported issues.
- [ ] Update `ManageAlbumsController.list` with exact-true root selection and
      unchanged prefix delegation (FR-4, FR-5, FR-9).
- [ ] Run `npm run lint -- src/web/controllers/manage-albums.controller.ts`
      after every edit and fix all reported issues.
- [ ] Run the focused controller test until it exits 0.

## Phase 3 — GraphQL adapter

### 3.1 Specify GraphQL selector behavior

- [ ] Extend `__tests__/web/graphql/album.resolver.test.ts` for omitted/false
      source, true scratch, and scratch-plus-prefix mapping.
- [ ] Extend `__tests__/web/graphql/graphql.integration.test.ts` for Boolean
      schema acceptance and invalid-type validation.
- [ ] Run per-file `npm run lint -- <modified-file>` after every test edit.

### 3.2 Implement and generate the GraphQL contract

- [ ] Add nullable `useScratchDir` Boolean to `AlbumListInput` (FR-2).
- [ ] Run `npm run lint -- src/web/modules/graphql/album.inputs.ts` after every
      edit and fix all reported issues.
- [ ] Update `AlbumResolver.albumList` with exact-true root selection.
- [ ] Run `npm run lint -- src/web/modules/graphql/album.resolver.ts` after
      every edit and fix all reported issues.
- [ ] Initialize the application to regenerate
      `src/web/modules/graphql/schema.gql`; do not hand-edit generated SDL.
- [ ] Run the focused GraphQL tests until they exit 0.

## Phase 4 — MCP adapter

### 4.1 Specify MCP schema, selection, and metadata

- [ ] Extend `__tests__/web/mcp.manage-albums.test.ts` for omitted/false
      source, true scratch, scratch-plus-prefix, invalid type, Boolean discovery
      schema, and retained read-only annotation.
- [ ] Run `npm run lint -- __tests__/web/mcp.manage-albums.test.ts` after every
      edit and fix all reported issues.

### 4.2 Implement MCP root selection

- [ ] Add optional boolean `useScratchDir` to
      `manageAlbumsListInputSchema` (FR-3, FR-7).
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts` after every
      edit and fix all reported issues.
- [ ] Update the list handler's exact-true selection and discovery
      title/description (FR-4, FR-10).
- [ ] Run `npm run lint --
      src/web/servers/mcp-tools/manage-albums/list.ts` after every edit and fix
      all reported issues.
- [ ] Run the focused MCP test until it exits 0.

## Phase 5 — Bruno and documentation

### 5.1 Add live source/scratch coverage

- [ ] Add `scratchAlbumEntry: scratch-only/` to the local Bruno environment.
- [ ] Add REST and GraphQL scratch-list requests that pass
      `useScratchDir: true` and assert the scratch-only marker.
- [ ] Add MCP default-source and scratch-selected list calls; parse JSON tool
      content and assert the scratch-only marker on the latter.
- [ ] Confirm the new requests invoke only the read-only list operation and
      retain the existing source-default requests.

### 5.2 Document the public selector

- [ ] Update `docs/graphql.md` with omitted/false source behavior, a scratch
      query example, and the no-client-root boundary.
- [ ] Update `docs/mcp-server.md` with `useScratchDir` semantics and revised
      list-tool description.
- [ ] Update `docs/testing.md` to create the scratch-only marker required by
      the live collection and remove only the known temporary paths afterward.

## Phase 6 — Final verification

### 6.1 Focused and full checks

- [ ] Re-run all focused Vitest commands from `design.md` section 9; exit 0.
- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0 with baseline pass count plus documented additions.

### 6.2 Live web collection

- [ ] Create a temporary scratch directory with `mktemp -d` and its known
      `scratch-only/` marker.
- [ ] Start `npm run web:serve` against the example source/destination roots
      and captured scratch root; retain the exact server PID.
- [ ] Run the complete Bruno collection command from `design.md` section 9;
      REST, GraphQL, and MCP source/scratch requests MUST pass.
- [ ] Stop the captured server PID, remove the known marker with `rmdir`, and
      remove the known empty scratch root with `rmdir`.

### 6.3 Scope and behavior audit

- [ ] Run both forbidden-path diff commands from `design.md` section 9 and
      confirm they are empty (NFR-7, NFR-8).
- [ ] Confirm the final diff contains only `design.md` section 2 files plus
      this spec directory.
- [ ] Confirm existing prefix/error/response tests still pass, MCP remains
      read-only, source remains the default, and the list operation made no
      filesystem changes.
