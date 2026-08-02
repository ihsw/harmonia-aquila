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

- [x] Record `git status --short` and preserve unrelated user changes.
- [x] Do not run whole-codebase `npm run lint` as a pre-flight baseline.
- [x] Run `npm test` and record baseline pass/fail counts.
- [x] Inventory active `fix-tags`, `albumFixTags`, `AlbumFixTags`, and
      `manage_albums_fix_tags` references across `src`, `__tests__`, `docs`,
      and `collections`.
- [x] Record current organize and fix option/error/output contracts needed for
      FR-2, FR-5, FR-8, FR-12, and FR-15.

> Pre-flight note: the worktree contained only this untracked spec. The first
> sandboxed baseline had 42/51 files and 214/246 tests pass because localhost
> listeners were denied; the approved rerun passed all 51 files and 246 tests.
> The active-contract audit found 98 references before migration. Installed
> boundaries are TypeScript 5.9, Vitest 4.1, MCP SDK 1.29, Zod 4.4, Commander
> 15, NodeNext ESM, and strict typed linting; no dependency change is needed.

## Phase 2 — Domain planning model

### 2.1 Extract merged types and metadata helpers

- [x] Introduce focused `organize-files-types.ts` and `metadata-fix-*.ts`
      modules per `design.md` §2 without changing behavior.
- [x] Preserve every former fix option default, conflict, set-metadata
      reconciliation, disc inference, and row field (FR-1, FR-2, FR-10).
- [x] Run `npm run lint -- <modified-file>` after each source edit and fix all
      findings immediately.

### 2.2 Project effective metadata

- [x] Add a pure projection from parsed source plus planned tag fix to the
      effective album metadata used by organization (FR-3, FR-4).
- [x] Refactor organization planning to consume projected records without
      parsing files a second time.
- [x] Emit one organization row with stable nested `tagChanges` for every
      selected file (FR-5, FR-12).
- [x] Add focused unit tests for no-op, missing album artist, set album,
      per-track metadata, reset track, producer/artist strategies, and disc
      inference projections.
- [x] Run per-file lint after every edited TypeScript file.

## Phase 3 — Safe execution

### 3.1 Implement staged repair and publish

- [x] Update the executor to create a unique temporary sibling, copy source,
      apply planned tags, verify relevant metadata, and rename only after the
      repair succeeds (FR-7).
- [x] Remove the temporary file on success and every failure path; preserve the
      causal error and stop sequential execution (FR-11).
- [x] Prove source files remain byte-for-byte unchanged, including overlapping
      configured roots (NFR-8).
- [x] Run per-file lint after every edited TypeScript file.

### 3.2 Integrate collision strategies

- [x] Preserve strict current behavior for `destinationStrategy: "error"`.
- [x] Implement exact-file ignore and overwrite semantics without deleting
      album directories or unrelated content (FR-8).
- [x] Add action and failure tests for all dry-run/execute pairs in FR-9,
      including cleanup after injected tag-write and publish failures.
- [x] Run per-file lint after every edited TypeScript file.

## Phase 4 — CLI migration

### 4.1 Merge command options and output

- [x] Add all former fix-tags flags to `manage-albums organize-files` and map
      them to the merged domain options (FR-1, FR-13).
- [x] Update dry-run help/output to describe both planned metadata repair and
      organization without implying writes.
- [x] Move fix command coverage into organize command tests, including JSON,
      plaintext, set-metadata, invalid strategies, and option conflicts.
- [x] Run per-file lint after every edited TypeScript file.

### 4.2 Remove standalone CLI registration

- [x] Delete the fix-tags command module and registration.
- [x] Assert the exact remaining manage-albums command order and unknown-command
      behavior for `fix-tags` (FR-13).
- [x] Run per-file lint after every edited TypeScript file.

## Phase 5 — REST and GraphQL migration

### 5.1 Consolidate REST

- [x] Merge fix fields into `organizeFilesBodySchema` and controller mapping;
      remove `fixTagsBodySchema` and `POST /manage-albums/fix-tags` (FR-14,
      FR-15).
- [x] Preserve configured roots, forbidden root overrides, boolean parsing,
      domain error translation, and logging behavior.
- [x] Move controller/disc/error tests to the combined endpoint and assert the
      removed route is not mapped.
- [x] Run per-file lint after every edited TypeScript file.

### 5.2 Consolidate GraphQL

- [x] Merge fix fields into `AlbumOrganizeFilesInput`, add a nested typed
      `tagChanges` result, and remove the fix mutation/input/row (FR-14).
- [x] Update resolver mappings, generated `schema.gql`, unit tests, and
      integration discovery/mutation assertions.
- [x] Preserve `BAD_USER_INPUT`, root selection, and dry-run defaults.
- [x] Run per-file lint after every edited TypeScript file.

## Phase 6 — MCP migration

### 6.1 Consolidate tool schema and registration

- [x] Merge native-number/boolean repair fields into
      `manageAlbumsOrganizeFilesInputSchema` and its handler mapping (FR-15).
- [x] Remove the fix tool name, factory, registration, and test-helper expected
      name; preserve deterministic list/summarize/validate/organize order.
- [x] Update descriptions to explain effective-metadata dry runs and direct
      destination output without a scratch handoff.
- [x] Run per-file lint after every edited TypeScript file.

### 6.2 Migrate MCP contract tests

- [x] Move schema, option mapping, disc repair, path traversal, domain error,
      execute, and dry-run safety coverage into organize MCP tests.
- [x] Assert `tools/list` omits `manage_albums_fix_tags` and the removed tool
      name cannot be called (FR-14).
- [x] Preserve `albumDir` trailing-slash and source/scratch input confinement.
- [x] Run per-file lint after every edited TypeScript file.

## Phase 7 — Collections and documentation

### 7.1 Migrate Bruno requests

- [x] Delete standalone REST, GraphQL, and MCP fix-tags requests and merge
      representative repair inputs/assertions into organize dry-run requests.
- [x] Update MCP tools-list order/absence assertions and retain traversal,
      invalid-strategy, root-override, and multiple-album conflict requests.
- [x] Ensure every collection request remains a dry run and contains no host
      filesystem path or execution flag.

### 7.2 Update active documentation

- [x] Rename `docs/fix-tags-set-metadata.md` to
      `docs/organize-files-set-metadata.md` and rewrite examples for the merged
      command.
- [x] Update album organization, GraphQL, MCP server, and testing docs to show
      one dry-run/execute operation and the combined row contract (FR-16).
- [x] Leave historical specs unchanged and distinguish historical mentions
      from active instructions in the final reference audit.

## Phase 8 — Verification

### 8.1 Targeted regression tests

- [x] Run the affected command, album-library, controller, GraphQL, and MCP
      Vitest files directly with `./node_modules/.bin/vitest run <files>`;
      exit 0.
- [x] Confirm tests cover projected metadata, exact dry-run/execute parity,
      all collision strategies, temp cleanup, source preservation, removed
      public surfaces, and unchanged ordinary organization.

### 8.2 Final repository checks

- [x] Run `npm run lint` only now, after all TypeScript edits; exit 0.
- [x] Run `npm run build`; exit 0 (NFR-2).
- [x] Run `npm test`; exit 0 and compare with the Phase 1 baseline (NFR-3).
- [x] Confirm every touched source/test file is at most 200 lines and no
      dependency or lockfile changed (NFR-5, NFR-7).

### 8.3 Live collection verification

- [x] Start `npm run web:serve -- --source-dir etc --dest-dir etc
      --scratch-dir etc --host 127.0.0.1 --port 3000` and retain its PID.
- [ ] From `collections/harmonia-aquila-web`, run
      `../../node_modules/.bin/bru run manage-albums graphql mcp --env local
      --bail`; exit 0.
- [x] Stop the captured server and confirm `git status --short -- etc` is empty.

### 8.4 Contract and scope audit

- [x] Run the active-reference audit from `design.md` §10; remove every stale
      contract reference and document any intentionally historical prose.
- [x] Confirm `git --no-pager diff --stat -- src __tests__ docs collections`
      matches `design.md` §2 and `git diff -- package.json package-lock.json`
      is empty (NFR-7, NFR-10).
- [x] Review the final diff for source mutation, traversal, overwrite, partial
      failure, and accidental compatibility-alias regressions.

## Phase 9 — Completion record

### 9.1 Record implementation evidence

- [x] Add concise blockquoted notes beneath relevant phases with baseline/final
      test counts, material design deviations, Bruno results, and blockers.
- [x] Verify every completed task was marked `[x]` immediately and leave any
      incomplete work accurately unchecked for resumption.

> Verification note: the affected regression set passed before finalization,
> including projected repairs, dry-run/execute parity, collision strategies,
> failure cleanup, unchanged source bytes, and retired CLI/REST/GraphQL/MCP
> surfaces. Final `npm run lint` and `npm run build` exited 0. Final `npm test`
> passed 50 files and 235 tests, compared with the 51-file/246-test baseline;
> the lower counts reflect removal of standalone fix suites and consolidation
> of the over-200-line mixed controller suite. Every touched TypeScript source
> and test is at most 200 lines, and package files are unchanged.
>
> Live verification note: the required server command was started and stopped,
> and one dry-run album-only Bruno invocation passed all 33 REST, GraphQL, and
> MCP requests (53 tests and 33 assertions). The exact all-folder Bruno command
> remains unchecked: it reaches the unrelated GraphQL audiobook requests and
> fails because the configured `etc` tree contains no M4B fixture. Creating
> source audio or changing audiobook collections would violate this spec's
> scope and source-mutation constraints. `git status --short -- etc` remained
> empty.
>
> Scope note: the implementation follows the planned metadata-helper and
> organization-planner split. The local album collection fixture was rebased
> from the soundtrack source path removed by its earlier organization workflow
> to the existing repaired-track directory. Active contract search returned no
> stale references; historical specs were intentionally not searched or
> changed. Dependency/lockfile diffs and `git diff --check` were empty. The
> final review found no compatibility aliases, traversal bypasses, broad
> deletion, source mutation, or unclean temporary-publication paths.
