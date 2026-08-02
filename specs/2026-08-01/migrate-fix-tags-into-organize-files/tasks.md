# Tasks: Migrate Fix Tags into Organize Files

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - **No edits outside album organization source/tests, generated GraphQL
>   schema, relevant album collections/docs, and this spec** (NFR-10). Stop and
>   surface any required scope expansion.
> - After **every** source-code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before moving on (NFR-1).
>   Lint only the file just modified and do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Never modify source audio while testing the combined pipeline (NFR-8).
> - Mark the matching `- [x]` checkbox **immediately** when each task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture baseline and inventory

- [ ] Record `git status --short` and preserve unrelated user changes.
- [ ] Do not run whole-codebase `npm run lint` as a pre-flight baseline.
- [ ] Run `npm test` and record baseline pass/fail counts.
- [ ] Inventory active `fix-tags`, `albumFixTags`, `AlbumFixTags`, and
      `manage_albums_fix_tags` references across `src`, `__tests__`, `docs`,
      and `collections`.
- [ ] Record current organize and fix option/error/output contracts needed for
      FR-2, FR-5, FR-8, FR-12, and FR-15.

## Phase 2 — Domain planning model

### 2.1 Extract merged types and metadata helpers

- [ ] Introduce focused `organize-files-types.ts` and `metadata-fix-*.ts`
      modules per `design.md` §2 without changing behavior.
- [ ] Preserve every former fix option default, conflict, set-metadata
      reconciliation, disc inference, and row field (FR-1, FR-2, FR-10).
- [ ] Run `npm run lint -- <modified-file>` after each source edit and fix all
      findings immediately.

### 2.2 Project effective metadata

- [ ] Add a pure projection from parsed source plus planned tag fix to the
      effective album metadata used by organization (FR-3, FR-4).
- [ ] Refactor organization planning to consume projected records without
      parsing files a second time.
- [ ] Emit one organization row with stable nested `tagChanges` for every
      selected file (FR-5, FR-12).
- [ ] Add focused unit tests for no-op, missing album artist, set album,
      per-track metadata, reset track, producer/artist strategies, and disc
      inference projections.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 3 — Safe execution

### 3.1 Implement staged repair and publish

- [ ] Update the executor to create a unique temporary sibling, copy source,
      apply planned tags, verify relevant metadata, and rename only after the
      repair succeeds (FR-7).
- [ ] Remove the temporary file on success and every failure path; preserve the
      causal error and stop sequential execution (FR-11).
- [ ] Prove source files remain byte-for-byte unchanged, including overlapping
      configured roots (NFR-8).
- [ ] Run per-file lint after every edited TypeScript file.

### 3.2 Integrate collision strategies

- [ ] Preserve strict current behavior for `destinationStrategy: "error"`.
- [ ] Implement exact-file ignore and overwrite semantics without deleting
      album directories or unrelated content (FR-8).
- [ ] Add action and failure tests for all dry-run/execute pairs in FR-9,
      including cleanup after injected tag-write and publish failures.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 4 — CLI migration

### 4.1 Merge command options and output

- [ ] Add all former fix-tags flags to `manage-albums organize-files` and map
      them to the merged domain options (FR-1, FR-13).
- [ ] Update dry-run help/output to describe both planned metadata repair and
      organization without implying writes.
- [ ] Move fix command coverage into organize command tests, including JSON,
      plaintext, set-metadata, invalid strategies, and option conflicts.
- [ ] Run per-file lint after every edited TypeScript file.

### 4.2 Remove standalone CLI registration

- [ ] Delete the fix-tags command module and registration.
- [ ] Assert the exact remaining manage-albums command order and unknown-command
      behavior for `fix-tags` (FR-13).
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 5 — REST and GraphQL migration

### 5.1 Consolidate REST

- [ ] Merge fix fields into `organizeFilesBodySchema` and controller mapping;
      remove `fixTagsBodySchema` and `POST /manage-albums/fix-tags` (FR-14,
      FR-15).
- [ ] Preserve configured roots, forbidden root overrides, boolean parsing,
      domain error translation, and logging behavior.
- [ ] Move controller/disc/error tests to the combined endpoint and assert the
      removed route is not mapped.
- [ ] Run per-file lint after every edited TypeScript file.

### 5.2 Consolidate GraphQL

- [ ] Merge fix fields into `AlbumOrganizeFilesInput`, add a nested typed
      `tagChanges` result, and remove the fix mutation/input/row (FR-14).
- [ ] Update resolver mappings, generated `schema.gql`, unit tests, and
      integration discovery/mutation assertions.
- [ ] Preserve `BAD_USER_INPUT`, root selection, and dry-run defaults.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 6 — MCP migration

### 6.1 Consolidate tool schema and registration

- [ ] Merge native-number/boolean repair fields into
      `manageAlbumsOrganizeFilesInputSchema` and its handler mapping (FR-15).
- [ ] Remove the fix tool name, factory, registration, and test-helper expected
      name; preserve deterministic list/summarize/validate/organize order.
- [ ] Update descriptions to explain effective-metadata dry runs and direct
      destination output without a scratch handoff.
- [ ] Run per-file lint after every edited TypeScript file.

### 6.2 Migrate MCP contract tests

- [ ] Move schema, option mapping, disc repair, path traversal, domain error,
      execute, and dry-run safety coverage into organize MCP tests.
- [ ] Assert `tools/list` omits `manage_albums_fix_tags` and the removed tool
      name cannot be called (FR-14).
- [ ] Preserve `albumDir` trailing-slash and source/scratch input confinement.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 7 — Collections and documentation

### 7.1 Migrate Bruno requests

- [ ] Delete standalone REST, GraphQL, and MCP fix-tags requests and merge
      representative repair inputs/assertions into organize dry-run requests.
- [ ] Update MCP tools-list order/absence assertions and retain traversal,
      invalid-strategy, root-override, and multiple-album conflict requests.
- [ ] Ensure every collection request remains a dry run and contains no host
      filesystem path or execution flag.

### 7.2 Update active documentation

- [ ] Rename `docs/fix-tags-set-metadata.md` to
      `docs/organize-files-set-metadata.md` and rewrite examples for the merged
      command.
- [ ] Update album organization, GraphQL, MCP server, and testing docs to show
      one dry-run/execute operation and the combined row contract (FR-16).
- [ ] Leave historical specs unchanged and distinguish historical mentions
      from active instructions in the final reference audit.

## Phase 8 — Verification

### 8.1 Targeted regression tests

- [ ] Run the affected command, album-library, controller, GraphQL, and MCP
      Vitest files directly with `./node_modules/.bin/vitest run <files>`;
      exit 0.
- [ ] Confirm tests cover projected metadata, exact dry-run/execute parity,
      all collision strategies, temp cleanup, source preservation, removed
      public surfaces, and unchanged ordinary organization.

### 8.2 Final repository checks

- [ ] Run `npm run lint` only now, after all TypeScript edits; exit 0.
- [ ] Run `npm run build`; exit 0 (NFR-2).
- [ ] Run `npm test`; exit 0 and compare with the Phase 1 baseline (NFR-3).
- [ ] Confirm every touched source/test file is at most 200 lines and no
      dependency or lockfile changed (NFR-5, NFR-7).

### 8.3 Live collection verification

- [ ] Start `npm run web:serve -- --source-dir etc --dest-dir etc
      --scratch-dir etc --host 127.0.0.1 --port 3000` and retain its PID.
- [ ] From `collections/harmonia-aquila-web`, run
      `../../node_modules/.bin/bru run manage-albums graphql mcp --env local
      --bail`; exit 0.
- [ ] Stop the captured server and confirm `git status --short -- etc` is empty.

### 8.4 Contract and scope audit

- [ ] Run the active-reference audit from `design.md` §10; remove every stale
      contract reference and document any intentionally historical prose.
- [ ] Confirm `git --no-pager diff --stat -- src __tests__ docs collections`
      matches `design.md` §2 and `git diff -- package.json package-lock.json`
      is empty (NFR-7, NFR-10).
- [ ] Review the final diff for source mutation, traversal, overwrite, partial
      failure, and accidental compatibility-alias regressions.

## Phase 9 — Completion record

### 9.1 Record implementation evidence

- [ ] Add concise blockquoted notes beneath relevant phases with baseline/final
      test counts, material design deviations, Bruno results, and blockers.
- [ ] Verify every completed task was marked `[x]` immediately and leave any
      incomplete work accurately unchecked for resumption.
