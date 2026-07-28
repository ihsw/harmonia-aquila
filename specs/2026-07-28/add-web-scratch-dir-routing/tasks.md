# Tasks: Add Web Scratch Directory Routing

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the files in `design.md` section 2 (NFR-8). If the
>   compiler proves an explicit `WebRoots` propagation edit is necessary in a
>   conditionally listed file, document it before editing. Stop for any other
>   scope expansion.
> - Do not modify shared album libraries, standalone `manage-albums` commands,
>   audiobook behavior, dependencies, or `etc/**`.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix reported issues before moving on
>   (NFR-1). This is per edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; never use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Audit roots and preserve the baseline

- [x] Record `git status --short`; preserve the user's unrelated `.ai/` work.
- [x] Audit every `WebRoots`, `WebPathResolver`, `createWebApp`, and `serveWeb`
      construction plus REST, GraphQL, MCP, Bruno, and documentation contracts.
- [x] Run the focused tests listed in `design.md` section 8 and record their
      baseline; do not run whole-codebase lint.

## Phase 2 — Root configuration and bootstrap

### 2.1 Add the normalized scratch root

- [x] Extend `WebRoots`, `normalizeWebRoots`, and `WebPathResolver` with
      required `scratchDir` per `design.md` section 3.
- [x] Extend root/bootstrap/controller fixtures with distinct temporary scratch
      directories and cleanup, including audiobook resolver fixtures that use
      the shared root type.
- [x] Add scratch normalization/invalid-directory coverage.
- [x] After every source/test edit, run `npm run lint -- <modified-file>` and
      rerun the focused bootstrap/controller tests.

### 2.2 Require `web serve --scratch-dir`

- [x] Add the option, missing/blank validation, and `serveWeb` propagation in
      `src/commands/web/serve.ts`.
- [x] Update command tests for help, each missing root, and the exact valid
      bootstrap object.
- [x] Run per-file lint after each edit and the focused web serve command test.

## Phase 3 — REST routing

### 3.1 Route album REST mutations

- [x] Add optional boolean `useScratchDir` to `organizeFilesBodySchema`.
- [x] Bind REST `fix-tags` destination to scratch and organize destination to
      source by default or scratch when requested; do not forward the flag.
- [x] Keep direct root overrides forbidden and make their messages consistent
      with the new routing without exposing configured paths.
- [x] Extend controller tests for fix scratch routing; organize omitted, false,
      and true routing; invalid input; and unchanged audiobook destination use.
- [x] Run per-file lint after each edit and the focused controller tests.

## Phase 4 — GraphQL routing

### 4.1 Extend the input and resolver

- [x] Add nullable Boolean `useScratchDir` to `AlbumOrganizeFilesInput`.
- [x] Bind GraphQL fix to scratch and organize to source/scratch according to
      the input without forwarding the adapter-only field.
- [x] Extend resolver tests for exact routing and unchanged audiobook bindings.
- [x] Run per-file lint after every edit and focused resolver tests.

### 4.2 Regenerate and verify SDL

- [x] Initialize the application to regenerate `schema.gql`; do not hand-edit
      generated SDL.
- [x] Verify `AlbumOrganizeFilesInput` contains `useScratchDir: Boolean`.
- [x] Extend GraphQL integration coverage for omitted/default and true routing
      contracts, then run per-file lint and the focused integration test.

## Phase 5 — MCP routing

### 5.1 Extend MCP schemas and tools

- [x] Add optional boolean `useScratchDir` to the organize tool schema.
- [x] Bind fix-tags to scratch and organization to the configured source or
      scratch root while preserving resolved `albumDir` as operation source.
- [x] Update tool descriptions to accurately describe scratch/source routing
      without exposing filesystem values.
- [x] Extend the MCP test helper with scratch ownership/cleanup and update
      exact-call tests for fix, omitted/false/true organize, resolved album
      source, invalid input, and unchanged discovery annotations.
- [x] Run per-file lint after every edit and focused MCP tests.

## Phase 6 — Bruno and documentation

### 6.1 Update dry-run collection coverage

- [x] Update existing REST, GraphQL, and MCP fix/organize requests so all three
      transports cover the default source and explicit scratch organization
      modes without `execute: true`.
- [x] Confirm requests assert existing status/envelope shapes and never accept
      direct root values.

### 6.2 Document the public contract

- [x] Update `docs/graphql.md` with scratch-backed fix and
      `useScratchDir` organization semantics.
- [x] Update `docs/mcp-server.md` with the third configured root, tool routing,
      and no-root-override guarantee.
- [x] Update `docs/testing.md` web server examples to include
      `--scratch-dir`, using an empty temporary scratch directory for smoke
      tests.

## Phase 7 — Final verification

### 7.1 Run final quality checks

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications; exit 0.
- [x] `npm run build` — exit 0 and regenerate no unexpected artifacts.
- [x] `npm test` — exit 0 with baseline pass count plus documented additions.

### 7.2 Run live dry-run smoke checks

- [x] Start `web serve` with distinct existing source, destination, and empty
      scratch roots using the command in `design.md` section 8.
- [x] Run the scoped Bruno manage-albums, GraphQL, and MCP requests; all pass.
- [x] Stop the captured server PID and verify source, destination, scratch, and
      `etc/**` are unchanged.

### 7.3 Verify scope and behavior

- [x] Run the NFR-8 forbidden-path diff command; output MUST be empty.
- [x] Confirm the final diff contains only `design.md` section 2 files and any
      previously documented conditional propagation file.
- [x] Confirm exact-call tests prove fix always targets scratch, organize
      omitted/false targets source, organize true targets scratch, and
      audiobook operations still target destination.
