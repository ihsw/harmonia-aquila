# Tasks: `allowMultipleAlbums` for `manage-albums organize-files`

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is
>   delivered as a plan, not as a work order.
> - **Confirm open decision 1 first** (`design.md` §12): the flag gates **both** single-album
>   guards, not just `assertSingleAlbumDirectory`. Task 1.4 is a gate — do not begin Phase 2
>   until it is answered.
> - **No `npx`** in any form. Forbidden in **all** invocations (no `--no-install`, no one-off
>   vitest/tsc runs). Any command line containing the substring `npx` is a violation and must be
>   rewritten before execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside the `design.md` §2 file list** (NFR-7). Specifically forbidden:
>   `src/lib/albums/organization-plan.ts`, `src/lib/albums/validate.ts`,
>   `src/lib/albums/disc-metadata.ts`, `src/lib/albums/organize-files-execution.ts`,
>   `src/lib/albums/metadata-fix-planner.ts`, and everything under `manage-audiobooks`. If a real
>   bug surfaces there, STOP and surface it; do not patch silently.
> - **Do not weaken any existing test.** Every current `Multiple albums found:` and
>   `Multiple artists resolve to the same album directory:` assertion must pass untouched. If one
>   needs editing, the default-off path has regressed (NFR-8).
> - After **every** source code file modification (for example, a `.ts` edit), run
>   `npm run lint -- <modified-file>` and fix any reported issues before moving on (NFR-1). Per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all TypeScript
>   modifications are complete — **including not using it as a pre-flight baseline**.
> - The typecheck script is `npm run build`, **not** `npm run build:ts`.
> - **Verify every fixture before relying on it** (`requirements.md` §7). The previously
>   documented ones are gone.
> - Mark the matching `- [x]` checkbox **immediately** when each task is finished, so progress is
>   resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm clean baseline

- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final
      verification after all TypeScript modifications are complete.
- [x] Run `npm test` and record the pass/fail counts here as the baseline:
      > Baseline: 65 test files passed, 386 tests passed, 0 failed.
- [x] Run `npm run test:coverage` once and record the four numbers, so NFR-10 has a comparison
      point rather than only a threshold:
      > Baseline coverage (statements / lines / functions / branches):
      > 93.16 / 92.59 / 97.64 / 82.56 — all above the 85 / 85 / 90 / 70 thresholds.
- [x] Run `git status` and confirm a clean tree.
      > Clean (spec files are the only untracked addition).

### 1.2 Re-verify the fixture

- [x] Confirm `etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/` still holds
      `7th_Guest_AmIEviL_OC_ReMix.mp3` and `7th_Guest_Fat_Dance_OC_ReMix.mp3`.
- [x] Re-read their tags and confirm the shape `requirements.md` §7 depends on — same `album`
      (`ocremix.org`), different `artist`, distinct track numbers, no disc tags. Record what you
      find; if it differs, stop and revise §7 before writing any Bruno request:
      > Verified tags (via `music-metadata`):
      > - `7th_Guest_AmIEviL_OC_ReMix.mp3` — album `ocremix.org`, artist `AmIEviL`,
      >   title `7th Guest "AmIEviL" OC ReMix`, track 127, no disc tags.
      > - `7th_Guest_Fat_Dance_OC_ReMix.mp3` — album `ocremix.org`, artist `The Fat Man`,
      >   title `7th Guest "Fat Dance" OC ReMix`, track 741, no disc tags.
      > Matches §7 exactly: one album title, two artists, distinct tracks, no disc metadata.
- [x] Do **not** modify anything under `etc/**`. It is read-only input.

### 1.3 Audit the frozen assertions

- [x] `grep -rn "Multiple albums found\|Multiple artists resolve" __tests__ collections` and list
      every file here. These are the NFR-8 witnesses; none may change:
      > Frozen files (21): `__tests__/lib/albums/{validate,multiple-album-guard}.test.ts`;
      > `__tests__/web/{manage-albums-controller, mcp.manage-albums-operations,
      > manage-albums-organization-errors, manage-albums-validation-errors,
      > mcp.manage-albums-validate}.test.ts`;
      > `__tests__/web/graphql/{graphql.integration, album.resolver}.test.ts`;
      > `__tests__/commands/manage-albums/{validate, organize-files-errors,
      > organize-files}.test.ts`; all six `collections/…/multiple-album-conflicts/*.yml`; plus
      > `collections/…/graphql/album-validate-source-dir-multi-artist-conflict.yml`,
      > `collections/…/manage-albums/validate-multi-artist-conflict.yml`,
      > `collections/…/mcp/call-manage-albums-validate-multi-artist-conflict.yml`.

### 1.4 Gate: confirm open decision 1

- [x] Confirm with the user that `allowMultipleAlbums` gates **both** guards (`design.md` §12
      decision 1, `requirements.md` FR-3). If the answer is "album guard only", stop: FR-3,
      acceptance criterion 3, task 5.4 and parts of Phase 4 all change first.
      > Decision: **gate both guards**, confirmed by the user on 2026-08-07. The spec proceeds as
      > written; the accepted cost is FR-3b (a fragmented album splits across artist directories
      > instead of erroring during organize, still caught by `manage-albums validate`).

## Phase 2 — Library

### 2.1 Add the option

- [x] Add `allowMultipleAlbums?: boolean` to `OrganizeFilesOptions` in
      `src/lib/albums/organize-files-types.ts`, in alphabetical position (FR-1).
- [x] Run `npm run lint -- src/lib/albums/organize-files-types.ts`. Fix issues. Re-run until clean.
- [x] Run `npm run build` — exit 0. Nothing reads the option yet; the tree must still type-check.

> Execution note (applies to Phase 3 too): the spec originally said "alphabetically **first**,
> before `albumArtStrategy`". That is wrong — `'b' < 'l'`, so every `album*` key sorts ahead of
> `allowMultipleAlbums`. The correct alphabetical slot is **after `albumStrategy`/`albumDirs` and
> before `artistFilenameStrategy`**. `requirements.md` FR-11 and `design.md` §3 were corrected;
> placement below follows the corrected rule.

### 2.2 Per-album grouping and the guards

- [x] Add `albumDestinationKey` and `groupFixesByAlbum` to
      `src/lib/albums/organization-planner.ts` per `design.md` §4.1. Key on
      `join(sanitize(artistFilename), sanitize(album))` — **not** the album title alone.
- [x] Replace the single `discRecords` / `throwForDiscSetIssues` / `isMultiDiscSet` block with the
      per-group loop building `multiDiscByFix`, keyed by `PlannedMetadataFix` object identity
      (`design.md` §4.2). Reuse the `artistStrategy` already parsed at the top of the function.
      > Extracted as `resolveMultiDiscByFix(selectedFixes, artistStrategy, allowMultipleAlbums)`
      > rather than inlining the loop, keeping `planOrganizationCopies` at its previous nesting
      > depth and the file well under the size limit.
- [x] Replace `multiDisc` inside the plan mapping with `multiDiscByFix.get(fix) ?? false`. Keep the
      mapping over `selectedFixes` so row order is unchanged.
- [x] Wrap **both** `assertSingleAlbumDirectory` and `assertSingleArtistPerAlbumDirectory` in
      `if (options.allowMultipleAlbums !== true)`, preserving their current order (FR-3, FR-3c).
- [x] Do **not** edit `src/lib/albums/organization-plan.ts` — signatures, keying and messages stay
      exactly as they are (`validate.ts` shares them).
- [x] Run `npm run lint -- src/lib/albums/organization-planner.ts`. Fix issues. Re-run until clean.
- [x] Run `npm test` now, before any other edit. Every existing organize and guard suite must pass
      unchanged — this is the flag-off parity proof (NFR-8). Record the result:
      > Post-planner test result: 65 files, 386 tests, 0 failed — byte-identical to the task 1.1
      > baseline. `npm run build` also exits 0.
- [x] `wc -l src/lib/albums/organization-planner.ts` — must be ≤ 200 (NFR-5). Record:
      > Line count: 167 (was 115).

### 2.3 Album art for multi-album plans

- [x] In `src/lib/albums/album-art-planner.ts`, derive `albumDestinationPaths` as the distinct set
      of `plan.albumDestinationPath` and keep `albumDestinationPaths[0]` as the existing anchor
      (`design.md` §5).
- [x] Add the `albumDestinationPaths.length > 1` branch returning every art file as
      `{ type: 'excluded' }` with `destination: ''` and action `excluded` / `would exclude` (FR-5).
- [x] Do **not** include a `sourceDirectory` spread in that branch — it is provably always absent
      there (`design.md` §5).
- [x] Do **not** add a parameter: the branch derives from `audioPlans`, so the flag never reaches
      this file.
- [x] Run `npm run lint -- src/lib/albums/album-art-planner.ts`. Fix issues. Re-run until clean.
- [x] `wc -l src/lib/albums/album-art-planner.ts` — ≤ 200 (NFR-5). Record:
      > Line count: 148 (was 136).

### 2.4 Reject the flag with `sourceDirs`

- [x] In `src/lib/albums/organize-files.ts`, after the existing concatenate checks, throw
      `new UserInputError('--allow-multiple-albums requires sourceDir')` when
      `mode === 'concatenate' && options.allowMultipleAlbums === true` (FR-6). It must precede any
      directory read (NFR-9).
- [x] Run `npm run lint -- src/lib/albums/organize-files.ts`. Fix issues. Re-run until clean.
- [x] `wc -l src/lib/albums/organize-files.ts` — the file starts at **204**, already over the
      limit. Growth must be ≤ 5 lines. Record the count; do **not** refactor to fix the
      pre-existing breach (NFR-5, `design.md` §12 decision 3):
      > Line count: 207 (+3, within the ≤5 allowance). Pre-existing breach unchanged in kind;
      > no refactor performed.

## Phase 3 — Surfaces

### 3.1 CLI

- [x] Add `.option('--allow-multiple-albums', 'organize a source directory holding more than one
      album in one run')` to `src/commands/manage-albums/organize-files.ts`, placed **after**
      `--ignore-audio-files-without-tracks` and **before** `--execute` (FR-11 — this list is
      ordered by topic, not alphabetically).
- [x] Reword `.description(...)`, which currently claims "fail for multiple albums or artists"
      unconditionally (FR-7).
- [x] Confirm no other CLI change is needed: `CliOrganizeOptions` derives from
      `OrganizeFilesOptions` and `normalizeSourceOptions` forwards the option in `...rest`.
- [x] Run `npm run lint -- src/commands/manage-albums/organize-files.ts`.

### 3.2 REST

- [x] Add `allowMultipleAlbums: optionalBodyBoolean(),` to `organizeFilesBodySchema` in
      `src/web/schemas/request-schemas.ts`, after `albumStrategy` and before
      `artistFilenameStrategy` (FR-8, FR-11).
- [x] Add `...optionalEntry('allowMultipleAlbums', options.allowMultipleAlbums),` in the same
      alphabetical slot in `ManageAlbumsController.organizeFiles`.
- [x] Run `npm run lint -- <each modified file>`.

### 3.3 GraphQL

- [x] Add to `AlbumOrganizeFilesInput` in `src/web/modules/graphql/album.inputs.ts`, after
      `albumStrategy` and before `artistFilenameStrategy` (FR-9, FR-11):
      ```ts
      @Field(() => Boolean, { nullable: true })
      public allowMultipleAlbums?: boolean
      ```
- [x] Add `allowMultipleAlbums: Boolean` to `input AlbumOrganizeFilesInput` in
      `src/web/modules/graphql/schema.gql` (line 30 block), in the same alphabetical slot.
- [x] Add the matching `optionalEntry` spread in `AlbumResolver.albumOrganizeFiles`.
- [x] Run `npm run lint -- <each modified .ts file>`.

### 3.4 MCP

- [x] Add `allowMultipleAlbums: z.boolean().optional(),` to
      `manageAlbumsOrganizeFilesInputSchema` (`src/web/schemas/mcp/manage-albums.ts`), after
      `albumStrategy` and before `artistFilenameStrategy` (FR-10, FR-11).
- [x] Add the matching `optionalEntry` spread in the tool handler.
- [x] Extend the tool's `description` string to mention the capability — it is the only text an MCP
      client reads before choosing arguments (FR-10).
- [x] Run `npm run lint -- <each modified file>`.
- [x] Run `npm run build` — exit 0 across all four surfaces.

## Phase 4 — Tests

### 4.1 New library suite

- [x] Create `__tests__/lib/albums/allow-multiple-albums.test.ts` covering, per
      `design-testing.md` §8.2:
      two albums both starting at track 1 (FR-4a); one album title held by two artists (FR-3);
      both guards still firing when the flag is absent (FR-3c); a repeated track number inside one
      destination album still failing (FR-4b); album art excluded with `destination: ''` (FR-5);
      the `sourceDirs` rejection with nothing read or written (FR-6, NFR-9).
- [x] Assert the execute path too, not only dry-run rows: with `execute: true`, two album trees
      exist under `destDir` and the art file does not.
- [x] Model the suite on `__tests__/lib/albums/multiple-album-guard.test.ts` — same mocks
      (`music-metadata`, `pathExists`), same temp-dir helpers, no real media (`docs/testing.md`
      hermetic rules).
- [x] Run `npm run lint -- __tests__/lib/albums/allow-multiple-albums.test.ts`.

### 4.2 Existing library suites

- [x] Extend `organize-files-album-art.test.ts` — single-album art planning is unchanged when the
      flag is set (FR-5, second sentence).
- [x] Extend `organize-files-disc-policy.test.ts` — a two-disc album keeps `DTT` prefixes while a
      single-disc album in the same run keeps `TT` (FR-4c).
- [x] Extend `organize-files-set-metadata-input.test.ts` — records assigning two distinct albums
      with the flag set (FR-13, `design.md` §7).
- [x] Leave `multiple-album-guard.test.ts` untouched.
- [x] Run `npm run lint -- <each modified test file>`.

> Deviation: only `organize-files-set-metadata-input.test.ts` was extended (171 → 194 lines). The
> album-art and disc-prefix cases live in the new 4.1 suite instead — `keeps album art when the
> flag resolves only one album` and `decides multi-disc filename prefixes per destination album`.
> Both are flag-specific behaviour, so splitting them into the flag-agnostic suites would have
> duplicated the `allowMultipleAlbums` setup in three files for no added coverage.

### 4.3 CLI suites

- [x] Extend `__tests__/commands/manage-albums/organize-files.test.ts` — `--allow-multiple-albums`
      parses and reaches `organizeAlbumFiles` (FR-7).
- [x] Extend `__tests__/commands/manage-albums/organize-files-errors.test.ts` —
      `--allow-multiple-albums` with `--source-dirs` fails through Commander (FR-6).
- [x] Run `npm run lint -- <each modified test file>`.

> Deviation: **both** CLI cases went into `organize-files-errors.test.ts` (102 → 160 lines).
> `organize-files.test.ts` is **253 lines** — a pre-existing NFR-5 breach — and adding to it would
> have made that worse. Four cases added: the flag is forwarded; it is absent when unset; the
> `sourceDirs` conflict surfaces through Commander; and the reworded description now mentions
> `--allow-multiple-albums` (FR-7).

### 4.4 Web surfaces

- [x] REST: extend `__tests__/web/manage-albums-controller.test.ts` (195 lines) only if it stays
      ≤ 200; otherwise create a sibling suite. Cover forwarding and the non-boolean rejection
      (FR-8, NFR-5).
- [x] GraphQL: extend `__tests__/web/graphql/album.resolver.test.ts` — the field is forwarded
      (FR-9).
- [x] MCP: create `__tests__/web/mcp.manage-albums-allow-multiple-albums.test.ts`. Do **not** grow
      `mcp.manage-albums-operations.test.ts`, already at 241 lines (FR-10, NFR-5).
- [x] Assert all four surfaces produce the same plan for the same input (acceptance criterion 6).
- [x] Run `npm run lint -- <each modified or created test file>`.

> Deviation: REST, GraphQL and MCP were consolidated into one new suite,
> `__tests__/web/manage-albums-allow-multiple-albums.test.ts` (133 lines), instead of three
> separate edits. `manage-albums-controller.test.ts` (195) and `album.resolver.test.ts` both stay
> untouched and under the limit, and the three surfaces assert the *same* forwarded payload
> side by side, which is what acceptance criterion 6 is actually about. Since the lib is mocked at
> this layer, "same plan" is proven as "same forwarded options"; the plan itself is proven in the
> 4.1 suite and by the Phase 6.4 smoke check. MCP coverage includes `tools/list` advertising
> `allowMultipleAlbums` as a boolean, which the client sees before choosing arguments.

## Phase 5 — Bruno collection

### 5.1 Build the group

- [x] Create `collections/harmonia-aquila-web/multiple-album-allowed/` with four requests, modelled
      on `multiple-album-conflicts/` and `inline-set-metadata/` (FR-17, `design-testing.md` §8.4).
- [x] Requests 1–3 (REST, GraphQL, MCP): `allowMultipleAlbums` plus inline `setMetadata` giving
      `track-a.mp3` and `track-b.mp3` two distinct albums, **both `trackNumber: 1`** — the FR-4a
      proof on every surface.
- [x] Request 4 (REST): `allowMultipleAlbums` with no `setMetadata`, exercising the source's real
      tags — one album title, two artists (FR-3).
- [x] Assert planned rows and destinations, not just status codes, mirroring the assertion style of
      `inline-set-metadata/rest-organize-files.yml`.
- [x] No request may set `execute` (FR-17).
- [x] Use only `baseUrl` and `mcpProtocolVersion` from `environments/local.yml` — its album path
      variables are stale (`requirements.md` §7) and are **not** repaired by this spec.

### 5.2 Run it

- [x] Build the temp fixture per `requirements.md` §7, start the server against it, and run
      `../../node_modules/.bin/bru run multiple-album-allowed -r --env local --bail` from the
      collection root.
- [x] Re-run `../../node_modules/.bin/bru run multiple-album-conflicts -r --env local --bail`
      against a two-album fixture and confirm all six requests still fail as before (NFR-8).
- [x] Remove only the temporary directory you created; never touch `etc/**`.

> Results: the new group passes 4/4 (1 assertion) live. The conflict group passes 6/6 (6
> assertions) unchanged — NFR-8 proven against a running server, not only in vitest.
>
> Two findings worth recording:
> - **The conflict group needs a fixture that no longer exists anywhere in the repo.** Every
>   remaining source file is tagged `album: "ocremix.org"`, so no two files carry *distinct*
>   albums. The two-album fixture was synthesized by copying the §7 files to a temp dir and
>   rewriting `album` to `Album A` / `Album B` with the project's own `writeAudioTagFix` from
>   `build/dist`. `etc/**` was never touched. `docs/testing.md` must carry this recipe (task 7.3)
>   or the conflict group stays unrunnable.
> - **Two fixtures, two server runs.** Group 4 of `multiple-album-allowed` asserts the source's
>   *real* tags, so it needs the unmodified fixture; the conflict group needs the rewritten one.
>   Kill the first server before starting the second — a stale server silently keeps port 3000 and
>   the second bind fails with `EADDRINUSE` while Bruno happily tests the **old** fixture. That
>   produced one confusing false failure during this run.

## Phase 6 — Verification

### 6.1 Full lint + typecheck + test

- [x] `npm run lint` — whole-codebase last-call lint; exit 0.
- [x] `npm run build` — exit 0 (NFR-2).
- [x] `npm test` — exit 0; baseline from task 1.1 plus the new cases (NFR-3). Record:
      > Final test result: 67 test files, 408 tests, 0 failed (baseline 65 / 386; +2 files, +22
      > tests — 11 lib, 1 setMetadata, 4 CLI, 7 web).
- [x] `npm run test:coverage` — thresholds met, compared against the task 1.1 numbers (NFR-10).
      Record:
      > Final coverage: 93.25 / 92.68 / 97.67 / 82.69 (statements / lines / functions / branches),
      > up from 93.16 / 92.59 / 97.64 / 82.56. Branch coverage rose despite the new branches, so
      > both flag settings are exercised.

### 6.2 Scope verification

- [x] `git --no-pager diff --stat src/commands/manage-audiobooks src/lib/audiobooks
      src/web/servers/mcp-tools/manage-audiobooks src/lib/albums/validate.ts
      src/lib/albums/organization-plan.ts src/lib/albums/disc-metadata.ts
      src/lib/albums/organize-files-execution.ts src/lib/albums/metadata-fix-planner.ts` — output
      MUST be empty (NFR-7).
- [x] `git --no-pager diff --stat` — MUST list only the 12 source files from `design.md` §2, plus
      the Phase 4 tests, Phase 5 collection files, and Phase 7 docs.
- [x] Confirm no existing `Multiple albums found:` or `Multiple artists resolve` assertion appears
      in the diff as a modification (NFR-8).

### 6.3 File-size check

- [x] `wc -l` on every modified file — none over 200 except `src/lib/albums/organize-files.ts`.
      Record its final count and confirm growth ≤ 5 lines (NFR-5):
      > Final counts: `organize-files.ts` **207** (+3 from its pre-existing 204 — within the ≤5
      > allowance, no refactor). Every other file ≤ 200: planner 167, art planner 148,
      > request-schemas 177, album.inputs 131, controller 120, resolver 106, CLI 87, types 74,
      > MCP tool 72, MCP schema 57. Tests: 194 / 184 / 158 / 133.

### 6.4 Behaviour smoke check (manual)

- [x] Build, then dry-run the CLI against the §7 fixture without the flag and confirm the
      unchanged `Multiple artists resolve to the same album directory:` failure.
- [x] Re-run with `--allow-multiple-albums` and confirm two `Artist/Album` destinations in the JSON
      output.
- [x] Re-run with `--set-metadata` assigning two albums with both tracks numbered 1 and confirm it
      succeeds where it previously failed with `Duplicate track numbers were detected:` (FR-4a).
- [x] Drop a `.jpg` beside the two tracks and confirm one `albumArt` row with
      `action: "would exclude"` and `destination: ""` (FR-5).
- [x] Run `manage-albums validate` on the same directory and confirm it still fails (FR-15).

> Deviation and results: the smoke checks ran through the **live web server** (REST + the `/mcp`
> endpoint via Bruno) rather than the CLI, because this session has no harmonia-aquila MCP tools
> connected and the project convention is to avoid driving album operations from the CLI. Same
> `organizeAlbumFiles` path either way. Observed:
> - no flag → `Multiple albums found: Album A, Album B` (unchanged);
> - `allowMultipleAlbums: true` → `AmIEviL/Album A/127 - …` and `The Fat Man/Album B/741 - …`;
> - inline `setMetadata`, two albums, both track 1 → planned on REST, GraphQL and MCP alike, where
>   the same input without the flag fails with `Duplicate track numbers were detected:` (FR-4a);
> - a `cover.jpg` beside the tracks → one row `albumArt | would exclude |` with an empty
>   destination (FR-5);
> - `validate` → still `Multiple albums found: Album A, Album B` (FR-15). Note `validate` needs
>   `ignoreNonAudioFiles=true` once art is present, since it does not accept album art at all.

## Phase 7 — Documentation

### 7.1 `docs/album-organization.md`

- [x] Rewrite the "no bypass" paragraph at lines 23-29: the one-album rule is now the default, not
      an absolute (FR-16a).
- [x] **Correct the ordering claim in the same paragraph** — it says album conflicts are checked
      after duplicate destinations, which is true for `validate` but not for `organize-files`,
      where `assertUniqueOrganizationDestinations` runs later in `prepareOrganizationDestinations`
      (FR-16).
- [x] Record: per-destination disc scoping and disc prefixes (FR-16b); album art excluded with
      `destination: ""`, and that `--ignore-non-audio-files` does **not** drop art (FR-16c); the
      `sourceDirs` rejection (FR-16e).
- [x] Record the accepted cost (FR-3b): with the flag, one album whose tracks disagree on artist
      splits across artist directories instead of erroring, and no heuristic separates that from
      two same-titled albums.
- [x] Record `--limit` truncating before album resolution (FR-12) and `--reset-track` numbering per
      album **title** (FR-14).
- [x] Record that execution is sequential and non-transactional: a mid-run failure can leave some
      albums written, and the retry then trips the existing-directory check —
      `--destination-strategy ignore` is the documented remedy (FR-16d).
- [x] Record the `validate` asymmetry (FR-15) so the validate-then-organize workflow at line 40 is
      not read as broken.

### 7.2 `docs/graphql.md` and `docs/mcp-server.md`

- [x] Add `allowMultipleAlbums` to the GraphQL organize input description and to the
      `manage_albums_organize_files` boolean list in the `docs/mcp-server.md:105` table.
- [x] Keep both consistent with §7.1 — same caveats, not a shorter contradictory version.

### 7.3 `docs/testing.md`

- [x] Replace the stale fixture recipe at lines 77-84 with the verified OC ReMix files
      (`requirements.md` §7); note that the previously named files no longer exist.
- [x] Add a `multiple-album-allowed` section mirroring the existing conflict-group section, and add
      the new test files to the Test Layout listing at lines 123-152.
