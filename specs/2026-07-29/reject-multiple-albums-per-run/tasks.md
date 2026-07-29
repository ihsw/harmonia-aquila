# Tasks: Reject Multiple Albums Per Validation or Organization Run

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the production, test, collection, and documentation
>   files listed in `design.md` section 2 (NFR-9). Stop and surface any
>   genuinely required scope expansion.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix every issue before the next edit
>   (NFR-1). Lint only that file, per edit and not merely per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; never use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current contracts and baseline

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Reconfirm output identity normalization, duplicate conflict ordering,
      validation invalid-row behavior, destination side-effect ordering, and
      all four client error translators.
- [ ] Record current line counts and use the focused test files in
      `design.md` rather than enlarging oversized tests.
- [ ] Run the five focused Vitest commands from `design.md` section 10 and
      record pass counts.
- [ ] Do not run whole-codebase `npm run lint` during pre-flight.

## Phase 2 — Specify the domain invariant

### 2.1 Add focused multiple-album tests

- [ ] Create `__tests__/lib/albums/multiple-album-guard.test.ts` with exact
      validation and organization failures for sorted normalized albums
      (FR-1–FR-6).
- [ ] Cover equivalent sanitized names, empty/single album behavior,
      limit-before-guard selection, and one-album multi-track success.
- [ ] Cover multiple-album precedence over multi-artist while preserving the
      exact old error for one album with multiple artists (FR-8).
- [ ] Cover dry-run and execute no-write behavior before destination
      inspection, plus validation invalid-row behavior (FR-5, FR-9).
- [ ] Run `npm run lint --
      __tests__/lib/albums/multiple-album-guard.test.ts` after every edit and
      fix all issues.

## Phase 3 — Implement shared enforcement

### 3.1 Add the shared album-directory guard

- [ ] Add `assertSingleAlbumDirectory` beside the existing shared identity
      guard with exact sorted error text and no path data (FR-1–FR-3).
- [ ] Run `npm run lint -- src/lib/albums/organization-plan.ts` after every
      edit and fix all issues.

### 3.2 Enforce one album during organization

- [ ] Call the guard after exact duplicate destinations and before the
      multi-artist guard and all destination inspection/writes (FR-4, FR-8,
      FR-9).
- [ ] Preserve `PlannedCopy` output identities, rows, limits, skips, and
      existing destination behavior.
- [ ] Run `npm run lint -- src/lib/albums/organize-files.ts` after every edit
      and fix all issues.
- [ ] Run the focused domain test until it exits 0.

### 3.3 Enforce one album during validation

- [ ] Build output identities once from rows with computable destinations,
      invoke the album guard before the artist guard, and preserve row issues
      (FR-5–FR-8).
- [ ] Run `npm run lint -- src/lib/albums/validate.ts` after every edit and
      fix all issues.
- [ ] Run the focused validation/domain tests until they exit 0.

## Phase 4 — CLI contracts

### 4.1 Update command descriptions and validation error coverage

- [ ] Update both CLI descriptions with the one-album-per-run rule (FR-11).
- [ ] Run per-file lint immediately after editing each command source.
- [ ] Parameterize the validation Commander error test with old and new exact
      messages; assert no rows.
- [ ] Run `npm run lint --
      __tests__/commands/manage-albums/validate.test.ts` after every edit.

### 4.2 Add focused organization CLI error coverage

- [ ] Create
      `__tests__/commands/manage-albums/organize-files-errors.test.ts` with a
      mocked shared operation.
- [ ] Assert the help description, Commander failure for the new error, no
      output rows, and no execute widening.
- [ ] Run targeted lint after every test edit and run all focused CLI tests.

## Phase 5 — Web client parity

### 5.1 Prove REST translation

- [ ] Parameterize the focused validation controller error test with old and
      new messages (FR-12).
- [ ] Add focused `manage-albums-organization-errors.test.ts` for the new
      organization HTTP 400 body without modifying the oversized controller
      test.
- [ ] Run per-file lint after every REST test edit and run both focused tests.

### 5.2 Prove GraphQL translation

- [ ] Parameterize resolver propagation for validation and organization with
      old and new messages (FR-13).
- [ ] Use the new message in existing GraphQL HTTP
      `BAD_USER_INPUT` integration coverage while retaining old-message
      resolver coverage.
- [ ] Confirm generated SDL is unchanged.
- [ ] Run per-file lint after every GraphQL test edit and run both focused
      GraphQL tests.

### 5.3 Prove MCP translation

- [ ] Parameterize validation and organization tool-error tests with old and
      new exact messages (FR-14).
- [ ] Preserve discovery schemas, annotations, source/scratch routing, and
      organization dry-run behavior.
- [ ] Run per-file lint after every MCP test edit and run both focused MCP
      tests.

## Phase 6 — Live client collection

### 6.1 Add six conflict requests

- [ ] Add the six REST, GraphQL, and MCP validation/organization requests
      under `multiple-album-conflicts/` as mapped in `design.md` section 7.
- [ ] Assert the exact `Multiple albums found:` prefix and each client's
      established status/error representation.
- [ ] Ensure organization calls omit execute and accept no root overrides.

### 6.2 Document temporary fixture setup

- [ ] Update `docs/testing.md` with safe commands to create three temporary
      roots and copy two known, distinct-album sample tracks.
- [ ] Document running only the special Bruno group, capturing/stopping the
      exact server process, and removing only known temporary paths.
- [ ] Explicitly forbid modifications to the source samples and `etc/**`.

## Phase 7 — Public documentation

### 7.1 Document the one-album invariant

- [ ] Update `docs/album-organization.md` for shared validation/organization
      behavior, exact prefix, precedence, and no bypass.
- [ ] Update `docs/graphql.md` for both operations' `BAD_USER_INPUT` behavior.
- [ ] Update `docs/mcp-server.md` for validation/organization tool errors,
      read-only/dry-run semantics, and pre-write timing.

## Phase 8 — Verification

### 8.1 Run focused and full checks

- [ ] Re-run all focused Vitest commands from `design.md` section 10; exit 0.
- [ ] `npm run lint` — final whole-codebase lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0 with baseline plus documented additions.

### 8.2 Run temporary-fixture Bruno checks

- [ ] Create the captured temporary source/scratch/destination roots and copy
      only the two known sample tracks.
- [ ] Start the built server with those roots and retain the exact process ID.
- [ ] Run the Bruno command from `design.md` section 10; six requests pass.
- [ ] Stop the captured process, remove the two known copies, and remove only
      known empty temporary directories with `rmdir`.

### 8.3 Audit scope and behavior

- [ ] Run the forbidden-path diff command from `design.md` section 10 and
      confirm it is empty (NFR-8, NFR-9).
- [ ] Confirm the final diff contains only `design.md` section 2 files plus
      this spec directory.
- [ ] Confirm no committed media changed and old multi-artist,
      missing-metadata, duplicate-destination, root, output, and client error
      contracts remain green.
