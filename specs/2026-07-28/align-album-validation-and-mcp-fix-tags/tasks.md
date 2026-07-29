# Tasks: Album Validation Collision Parity and MCP Fix-Tags Album Selection

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** the production, test, collection, and documentation
>   scope in `design.md` section 2 (NFR-9). Preserve the user's existing
>   `bin/web-serve.sh` change. Stop and request approval if expansion is
>   genuinely required.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before the next edit
>   (NFR-1). This is per source-code edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications are complete; do not use it as a pre-flight
>   baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current behavior and worktree boundaries

- [ ] Record `git status --short`, preserving the unrelated
      `bin/web-serve.sh` modification.
- [ ] Inspect the current validate row semantics, organize guard ordering,
      client error translators, MCP schemas, and `WebPathResolver`.
- [ ] Confirm no whole-codebase lint is run during pre-flight.
- [ ] Run the focused validation, organization, controller, GraphQL, and MCP
      tests from `design.md` section 9 as the behavioral baseline.

## Phase 2 — Shared collision invariant

### 2.1 Extract the album-to-artist output guard

- [ ] Add the typed shared guard to
      `src/lib/albums/organization-plan.ts` per `design.md` section 3.
- [ ] Preserve deterministic sorting, exact error text, sanitized-segment
      inputs, and path confidentiality.
- [ ] Run `npm run lint -- src/lib/albums/organization-plan.ts`; fix and rerun
      until clean.

### 2.2 Preserve organize-files behavior

- [ ] Replace the private grouping block in
      `src/lib/albums/organize-files.ts` with the shared guard at the same
      pre-destination-inspection location.
- [ ] Run `npm run lint -- src/lib/albums/organize-files.ts`; fix and rerun
      until clean.
- [ ] Update the organize regression test only if needed to lock down helper
      extraction, then lint that test file.
- [ ] Run the focused organize-files test.

## Phase 3 — Validation failure behavior

### 3.1 Apply the shared guard to validation

- [ ] Update `src/lib/albums/validate.ts` to assert computable sanitized output
      identities after duplicate destination issues are applied.
- [ ] Preserve missing metadata, duplicate destination, strategy, limit, and
      read-only behavior.
- [ ] Run `npm run lint -- src/lib/albums/validate.ts`; fix and rerun until
      clean.

### 3.2 Add domain and CLI coverage

- [ ] Extend `__tests__/lib/albums/validate.test.ts` for exact conflict text,
      sanitization, same-artist success, limit-before-guard behavior, and
      unchanged invalid-row semantics.
- [ ] Split the test file if needed to keep every produced test file at or
      below 200 lines.
- [ ] Extend `__tests__/commands/manage-albums/validate.test.ts` to assert
      Commander failure and no output rows; update CLI help text if needed.
- [ ] Lint each modified source/test file immediately after its edit.
- [ ] Run the focused validation domain and CLI tests.

## Phase 4 — Four-surface validation parity

### 4.1 Assert REST failure translation

- [ ] Extend `__tests__/web/controllers.test.ts` so the shared validation
      `UserInputError` maps to the exact existing HTTP 400 body.
- [ ] Run `npm run lint -- __tests__/web/controllers.test.ts`; fix and rerun
      until clean.
- [ ] Run the focused controller test.

### 4.2 Assert GraphQL failure translation

- [ ] Extend the album resolver test to preserve the exact validation error.
- [ ] Extend GraphQL HTTP integration coverage to assert
      `extensions.code = BAD_USER_INPUT` for validation conflict.
- [ ] Lint each modified GraphQL test immediately after its edit.
- [ ] Run both focused GraphQL tests and confirm no SDL change.

### 4.3 Assert MCP validation failure translation

- [ ] Extend MCP album-tool coverage so `manage_albums_validate` returns tool
      error content containing the exact shared conflict.
- [ ] Preserve the tool's read-only annotation, input schema, and successful
      row response.
- [ ] Split the existing oversized MCP test into focused files before adding
      cases, if required by NFR-5.
- [ ] Lint each modified MCP test and run the focused MCP test set.

## Phase 5 — MCP fix-tags album selection

### 5.1 Add and route required `albumDir`

- [ ] Add one reusable required slash-terminated `albumDir` Zod field and use
      it in both fix-tags and organize-files MCP schemas.
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts`; fix and rerun
      until clean.
- [ ] Resolve MCP fix-tags `albumDir` inside the configured source root and
      pass it as `sourceDir`, retaining scratch as `destDir` and all option
      mappings.
- [ ] Update the tool description to reference directories returned by
      `manage_albums_list`.
- [ ] Run lint on the modified fix-tags tool file.

### 5.2 Prove MCP discovery, routing, and rejection

- [ ] Assert tool discovery marks `albumDir` required and documents the source
      selector.
- [ ] Assert a valid album directory produces the exact resolved-source and
      scratch-destination `fixAlbumTags` call.
- [ ] Assert missing, malformed, traversal, and invalid-option requests fail
      before `fixAlbumTags`.
- [ ] Assert execute and dry-run requests preserve identical root routing.
- [ ] Lint each modified test file and run the focused MCP tests.

## Phase 6 — Collections and documentation

### 6.1 Update safe client requests

- [ ] Add or update validation conflict requests for REST, GraphQL, and MCP
      where a deterministic test fixture is available; keep them read-only.
- [ ] Update the MCP fix-tags request to supply a listed slash-terminated
      `albumDir`, `limit: 0`, and no execute flag.
- [ ] Add an MCP fix-tags traversal request if none exists and assert tool
      error content.
- [ ] Do not change REST or GraphQL fix-tags request contracts.

### 6.2 Document the contracts

- [ ] Update `docs/album-organization.md` to state that validation rejects the
      same multi-artist/same-album output as organization.
- [ ] Update `docs/graphql.md` with validation's `BAD_USER_INPUT` behavior.
- [ ] Update `docs/mcp-server.md` with validation parity and required,
      source-confined MCP fix-tags `albumDir`.

## Phase 7 — Verification

### 7.1 Run focused checks

- [ ] Run all five focused Vitest commands in `design.md` section 9; each
      exits 0.
- [ ] Run `npm run build`; exit 0.
- [ ] Run affected Bruno requests against a temporary three-root server with
      execute omitted; stop the captured server process.
- [ ] Confirm source, scratch, destination, and `etc/**` remain unchanged.

### 7.2 Run final quality checks

- [ ] `npm run lint` — final whole-codebase lint after all TypeScript edits;
      exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0.

### 7.3 Verify scope and resumability

- [ ] Run the forbidden-path diff command from `design.md` section 9 and
      confirm this spec introduced no forbidden changes.
- [ ] Confirm the final diff lists only approved files and preserves the
      pre-existing `bin/web-serve.sh` modification.
- [ ] Mark every completed checkbox immediately and record any deferred
      collection verification beneath its task as a blockquoted note.
