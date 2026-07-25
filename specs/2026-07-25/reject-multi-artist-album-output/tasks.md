# Tasks: Reject Multi-Artist Same-Name Album Output

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the files and client artifacts listed in `design.md`
>   section 2 (NFR-5). Stop and request scope approval if another file is
>   genuinely required.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before the next edit
>   (NFR-1). This is per edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current behavior and boundaries

- [x] Inspect the current organization planning order, existing exact-path and
      existing-directory guards, and the current dirty-worktree state.
- [x] Confirm the shared fixture has two artists, one normalized album name,
      and distinct track/title paths so it reaches the new guard.
- [x] Do not run whole-codebase `npm run lint` as a baseline; reserve it for
      final verification.

## Phase 2 — Domain safeguard and CLI

### 2.1 Add normalized album-to-artist conflict detection

- [x] Modify `src/lib/albums/organize-files.ts` per `design.md` section 3:
      group sanitized planned album output segments and reject any group with
      multiple sanitized artist output segments before stat or copy work.
- [x] Keep the existing exact duplicate-file-destination error ordered ahead
      of the new guard, and make the new error stable and path-safe.
- [x] Run `npm run lint -- src/lib/albums/organize-files.ts`. Fix and rerun
      until clean.

### 2.2 Prove core behavior and CLI wording

- [x] Extend `__tests__/commands/manage-albums/organize-files.test.ts` for
      dry-run and execute failures, no destination output, a valid multi-track
      same-artist album, and sanitized-segment behavior if practical.
- [x] Update `src/commands/manage-albums/organize-files.ts` help text to state
      the multi-artist same-name-album failure behavior.
- [x] Run lint after each edited source/test file, then run
      `./node_modules/.bin/vitest run __tests__/commands/manage-albums/organize-files.test.ts`.

## Phase 3 — REST client parity

### 3.1 Assert REST error translation

- [x] Extend `__tests__/web/controllers.test.ts` (and a web integration test if
      needed) so a `UserInputError` from organize-files remains the established
      HTTP 400 error body without any route/body/root behavior change.
- [x] Run `npm run lint -- __tests__/web/controllers.test.ts` and the focused
      web controller test.

### 3.2 Add REST Bruno coverage

- [ ] Add a conflict request beside the organize-files REST collection request
      and assert HTTP 400 plus the deterministic error message.
- [ ] Preserve existing successful, invalid-input, and root-override requests.

## Phase 4 — GraphQL client parity

### 4.1 Assert GraphQL error translation

- [x] Extend the album resolver and GraphQL integration tests to assert the
      mutation presents the domain failure as `BAD_USER_INPUT`, with no schema
      or mutation signature change.
- [x] Run lint after every edited GraphQL test and execute the focused Vitest
      commands from `design.md` section 8.

### 4.2 Add GraphQL Bruno coverage and documentation

- [ ] Add a GraphQL organize-files conflict request that asserts an error
      envelope and `BAD_USER_INPUT`.
- [x] Update `docs/graphql.md` to document the organize-files safeguard and
      preserve its existing dry-run/execute guidance.

## Phase 5 — MCP client parity

### 5.1 Assert MCP tool failure behavior

- [x] Extend `__tests__/web/mcp.manage-albums.test.ts` to assert the existing
      tool error representation exposes the conflict message while tool name,
      input schema, annotations, and root confinement stay unchanged.
- [x] Run `npm run lint -- __tests__/web/mcp.manage-albums.test.ts` and the
      focused MCP test.

### 5.2 Add MCP Bruno coverage and documentation

- [ ] Add an MCP `tools/call` conflict request that asserts error content and
      leaves the existing tool-list request unchanged.
- [x] Update `docs/mcp-server.md` to describe the non-bypassable safeguard for
      `manage_albums_organize_files`.

## Phase 6 — Shared documentation and live collection verification

### 6.1 Document operation safety

- [x] Update `docs/album-organization.md` so its safe execution guidance
      explains the multi-artist same-name-album failure and does not recommend
      manual overwrite or merge workarounds.

### 6.2 Run client smoke checks

- [ ] Start a temporary root-scoped `web serve` process, run the affected REST,
      GraphQL, and MCP Bruno folders using `./node_modules/.bin/bru`, then stop
      the recorded process.
- [ ] Confirm the temporary source and destination fixtures contain no writes
      from a rejected execute request.

## Phase 7 — Final verification

### 7.1 Run quality checks

- [x] `npm run lint` — final whole-codebase lint; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0.

### 7.2 Verify scope and behavior

- [x] Confirm all four clients expose the one domain error rule and no adapter
      duplicates detection logic (NFR-4).
- [x] `git --no-pager diff --stat -- src/lib/audiobooks src/commands/manage-audiobooks package.json package-lock.json`
      must be empty (NFR-5).
- [x] Confirm the diff contains only the planned service, CLI description,
      client coverage, collection, and documentation changes from
      `design.md` section 2.
