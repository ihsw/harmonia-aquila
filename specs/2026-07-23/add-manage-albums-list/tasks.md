# Tasks: Add Manage Albums List

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the files in `design.md` section 2 (NFR-8). Stop and
>   request approval for scope expansion; do not modify dependencies, fixtures,
>   audiobook code, or existing public operation contracts.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix all reported issues before moving
>   on (NFR-1). Do this per edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; do not use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm shared and adapter conventions

- [ ] Inspect existing album command/library tests, web path/error adapters,
      GraphQL contracts, MCP registration, collection request patterns, and
      dirty-worktree state.
- [ ] Confirm the change is additive to CLI, REST, GraphQL, MCP, and Bruno
      only; do not run whole-codebase lint as a pre-flight baseline.

## Phase 2 — Shared operation and CLI

### 2.1 Define the root-confined listing contract

- [ ] Create `__tests__/lib/albums/list.test.ts` for root/nested prefixes,
      direct-only sorted output, directory suffixes, invalid prefix forms,
      non-directory paths, and symlink escape.
- [ ] Create `src/lib/albums/list.ts` per `design.md` section 3, then run
      `npm run lint -- src/lib/albums/list.ts` and the focused library test.
- [ ] Run `npm run lint -- __tests__/lib/albums/list.test.ts` after every test
      edit and fix issues.

### 2.2 Add and register the CLI command

- [ ] Create `src/commands/manage-albums/list.ts` with root, prefix, formats,
      output, and `UserInputError` behavior.
- [ ] Register the command and update command/CLI tests for output and errors.
- [ ] Run `npm run lint -- <modified-file>` after each source/test edit and run
      focused CLI and registration tests.

## Phase 3 — REST and MCP adapters

### 3.1 Add the REST endpoint

- [ ] Add optional-prefix request parsing and `GET /manage-albums/list` that
      uses the configured source root and `throwHttpError`.
- [ ] Extend controller tests for root/prefix mapping and REST 400 traversal or
      malformed-prefix responses without calling the library.
- [ ] Run per-file lint and the focused controller test after each edit.

### 3.2 Add the MCP tool

- [ ] Add `MANAGE_ALBUMS_LIST_TOOL_NAME`, optional prefix schema, read-only tool
      factory, and registration.
- [ ] Extend MCP manage-albums tests for discovery, mapping, JSON content, and
      source-root traversal rejection.
- [ ] Run per-file lint and the focused MCP test after each edit.

## Phase 4 — GraphQL adapter

### 4.1 Add query contract and resolver

- [ ] Add `AlbumListInput` and `albumList` query to the album GraphQL contracts
      and resolver, delegating to the shared operation with configured root.
- [ ] Initialize the application to regenerate and commit `schema.gql`; never
      hand-edit generated SDL.
- [ ] Run per-file lint and focused GraphQL resolver/integration tests after
      each edit.

## Phase 5 — Bruno and documentation

### 5.1 Add REST and GraphQL collection coverage

- [ ] Extend `local.yml` with blank/root and slash-terminated nested list
      variables only.
- [ ] Add REST successful/traversal requests and assert the REST status/body
      contracts from `design.md` section 5.
- [ ] Add GraphQL successful/traversal requests and assert data/error envelopes
      without requiring non-empty fixture output.

### 5.2 Document public surfaces

- [ ] Update `docs/graphql.md`, `docs/mcp-server.md`, and `docs/testing.md` for
      the added query/tool/test path without exposing configured roots.

## Phase 6 — Final verification

### 6.1 Run final quality and live checks

- [ ] `npm run lint` — final whole-codebase lint after all TypeScript changes;
      exit 0.
- [ ] `npm run build` and `npm test` — exit 0.
- [ ] Start `npm run web:serve -- --source-dir etc --dest-dir etc --host
      127.0.0.1 --port 3000`, retain its PID, and run
      `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run
      manage-albums graphql --env local --bail`.
- [ ] Stop the captured server PID and confirm no `etc/**` files changed.

### 6.2 Verify scope

- [ ] Confirm all adapters return/validate the same string-array list contract
      through focused tests and Bruno.
- [ ] `git --no-pager diff --stat -- src/commands/manage-audiobooks
      src/web/modules/graphql/audiobook* src/web/controllers/manage-audiobooks.controller.ts`
      is empty (NFR-8).
- [ ] Confirm the final diff is confined to `design.md` section 2.
