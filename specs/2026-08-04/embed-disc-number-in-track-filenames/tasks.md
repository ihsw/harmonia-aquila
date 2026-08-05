# Tasks: Embed Disc Number in Track Filenames

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution;
>   this spec is a plan, not a work order.
> - **No `npx`** in any form. Use repository `npm run` scripts or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - Make no edits outside `src/lib/albums/organization-plan.ts`,
>   `src/lib/albums/organization-planner.ts`, `src/lib/albums/organize-files.ts`,
>   `src/lib/albums/validate.ts`, their focused tests under `__tests__/lib/albums/`
>   and `__tests__/commands/manage-albums/`, and organize-files documentation
>   (design §2). No CLI, REST, GraphQL, MCP schema files, or
>   `disc-metadata.ts`/`metadata-fix-planner.ts`/`concatenate-album-sources.ts`/
>   `album-art-planner.ts` should need changes (design §2 "Files explicitly NOT
>   modified") — if one does, STOP and confirm scope before editing.
> - Do not modify `etc/albums/**`, `package.json`, or lockfiles.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before continuing
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline;
>   reserve it for final verification after all TypeScript modifications are
>   complete.
> - Mark the matching `- [ ]` checkbox **immediately** when each task
>   finishes so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture the baseline

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Run `npm test`, recording pass/fail counts without running
      whole-codebase lint.
- [ ] Confirm dependency manifests are unchanged before implementation.
- [ ] Confirm current line counts of `organization-plan.ts`,
      `organization-planner.ts`, `organize-files.ts`, and `validate.ts`
      (design §2 budget check, NFR-5).
- [ ] Run `grep -rn "Disc DD\|DiscLayout\|discLayout" src __tests__ docs` and
      record every hit as the pre-change inventory to reconcile against in
      Phase 8.

## Phase 2 — Core prefix logic

### 2.1 Extend `organization-plan.ts`

- [ ] Add `discTotal: number | null` to `DiscDestinationContext` (design
      §3.1, FR-3).
- [ ] Add exported `formatDiscTrackPrefix(discNumber, discTotal, trackNumber)`
      implementing the width rule: pad disc digits to
      `max(1, discTotal.toString().length)`, immediately followed by
      `formatTrackNumber(trackNumber)` (design §3.1, FR-2).
- [ ] Rewrite `getAlbumDestination` to build `trackFilename` using
      `formatDiscTrackPrefix` when `multiDisc && discNumber !== null &&
      discTotal !== null`, else the existing plain `formatTrackNumber`
      prefix; delete the `Disc ${...}` nested-`join` branch entirely so
      there is exactly one `join(albumDirectory, trackFilename)` return path
      (design §3.1, FR-1, FR-7).
- [ ] After the edit, run `npm run lint -- src/lib/albums/organization-plan.ts`.
      Fix issues.

### 2.2 Unit-test the prefix rule directly

- [ ] Create `__tests__/lib/albums/organization-plan.test.ts` covering the
      padding matrix from design §5: 2-disc (`101`, `201`), 9-disc (`101`
      ... `901`), 10-disc (`0101` ... `1005`), 22-disc (`0301`, `2205`); the
      `multiDisc: false` gate ignoring a non-null disc context; the
      `multiDisc: true` gate falling back to the plain prefix when
      `discNumber` or `discTotal` is null (FR-3).
- [ ] After the edit, run
      `npm run lint -- __tests__/lib/albums/organization-plan.test.ts`. Fix
      issues.

## Phase 3 — Remove `DiscLayout` and wire callers

### 3.1 `organization-planner.ts`

- [ ] Delete the exported `DiscLayout` type and the `discLayout` parameter
      from `planOrganizationCopies`; pass `effective.discTotal` into the
      `getAlbumDestination` call's context; remove the
      `discLayout === 'disc-directories' &&` gate so `multiDisc` alone
      controls the prefix (design §3.2, FR-3, FR-4).
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/organization-planner.ts`. Fix issues.

### 3.2 `organize-files.ts`

- [ ] Update the `organizeConcatenatedAlbum` call to
      `planOrganizationCopies` to drop the explicit `'flat'` fourth argument
      (design §3.3, FR-4). Confirm `organizeSingleAlbum`'s call already
      needs no change.
- [ ] After the edit, run `npm run lint -- src/lib/albums/organize-files.ts`.
      Fix issues.
- [ ] Confirm the file's line count did not increase versus the Phase-1
      baseline (NFR-5).

### 3.3 `validate.ts`

- [ ] Pass `discTotal: parsed.discTotal` into the `getAlbumDestination` call
      alongside the existing `discNumber`/`multiDisc` (design §3.4, FR-5).
- [ ] After the edit, run `npm run lint -- src/lib/albums/validate.ts`. Fix
      issues.

## Phase 4 — Update existing single-source/disc-directories tests

### 4.1 Rename expected destinations

- [ ] `__tests__/lib/albums/organize-files-metadata-disc.test.ts`: update
      the four `Disc DD/TT - Title.ext` expectations to the prefixed form
      (design §5).
- [ ] `__tests__/lib/albums/organize-files-disc-policy.test.ts`: update the
      two `Disc DD/TT - Title.ext` expectations in `'rejects repeated tracks
      by default and infers only when requested'`; leave single-disc cases
      in this file untouched.
- [ ] `__tests__/lib/albums/organize-files-album-art.test.ts`: update the
      one `Disc 01/01 - Song.flac` expectation.
- [ ] `__tests__/lib/albums/validate-disc.test.ts`: update the two
      `Disc DD/TT - Title.ext` expectations.
- [ ] `__tests__/commands/manage-albums/organize-files-disc.test.ts`: update
      the two `Disc DD/TT - Title.ext` expectations.
- [ ] After each edit, run `npm run lint -- <modified-test-file>`. Fix
      issues.

## Phase 5 — Update concatenate tests

### 5.1 Rename expected destinations

- [ ] `__tests__/lib/albums/organize-files-concatenate.test.ts`: update
      `'preserves local tracks, assigns ordered disc metadata...'` and
      `'organizes a fully tagless two-disc source using setMetadata...'` to
      the prefixed destinations (design §5).
- [ ] `__tests__/lib/albums/organize-files-concatenate-execution.test.ts`:
      update `'preserves correct disc metadata and local tracks...'` and
      `'executes a fully tagless two-disc source...'` to the prefixed
      destinations; keep (and strengthen with an explicit prefix assertion)
      the `!r.destination.includes('Disc')` check.
- [ ] `__tests__/commands/manage-albums/organize-files.test.ts`: update
      `'accepts ordered sourceDirs and albumArtStrategy for concatenate'`
      and `'accepts --set-metadata together with --source-dirs for
      concatenate'` to the prefixed destinations.
- [ ] After each edit, run `npm run lint -- <modified-test-file>`. Fix
      issues.

### 5.2 Rewrite the now-impossible collision fixtures

- [ ] `__tests__/lib/albums/organize-files-concatenate.test.ts`: rewrite
      `'rejects an exact flat destination collision'` into a success case
      asserting two distinct `'would copy'` rows with destinations
      `Artist/Album/101 - Same.flac` and `Artist/Album/201 - Same.flac`
      (design §4, FR-6, AC-2).
- [ ] `__tests__/lib/albums/organize-files-concatenate-execution.test.ts`:
      rewrite `'atomically rejects duplicate flat audio destinations before
      any write'` into a success case asserting both files are written to
      their distinct destinations (design §4, FR-6, AC-2).
- [ ] After each edit, run `npm run lint -- <modified-test-file>`. Fix
      issues.

## Phase 6 — Regression proof

### 6.1 Prove no unrelated destination logic broke

- [ ] Run the full suite and confirm: single-disc destinations are
      byte-for-byte unchanged (AC-4); `assertUniqueOrganizationDestinations`
      unit coverage in `organize-files-disc-policy.test.ts` (synthetic
      fixture, untouched by this spec) still passes; album-art collision
      tests still pass unchanged; the "pre-existing directory" conflict test
      still passes unchanged.
- [ ] Cross-check AC-5: pick one multi-disc fixture and confirm
      `organizeAlbumFiles` (dry run) and `validateAlbums` produce an
      identical `destination` string for it.
- [ ] After any incidental edit, run `npm run lint -- <modified-file>`.

## Phase 7 — Documentation

### 7.1 Update destination-shape documentation

- [ ] Update `docs/album-organization.md`'s Multi-disc metadata section:
      replace the `Disc DD/` description and its worked example with the
      prefix rule and its own worked example; remove the concatenate-only
      "no Disc DD directories" callout (now true for every multi-disc case,
      not concatenate-specific).
- [ ] Update `docs/organize-files-set-metadata.md`'s Days of Purgatory
      worked example: replace "resolve to distinct destination filenames
      because their titles differ" with the disc-prefix explanation (design
      §6 step 6).
- [ ] After each edit, run `npm run lint -- <modified-file>` if the doc
      tooling lints Markdown; otherwise skip lint for doc-only files.

## Phase 8 — Final verification

### 8.1 Run last-call checks

- [ ] Run whole-codebase `npm run lint` only now; require exit 0.
- [ ] Run `npm run build`; require exit 0.
- [ ] Run `npm test`; require exit 0 and reconcile with the Phase-1
      baseline.

### 8.2 Verify scope and acceptance

- [ ] Run `grep -rn "DiscLayout\|discLayout" src __tests__` and confirm zero
      hits (AC-6).
- [ ] Run `grep -rn "Disc [0-9][0-9]/" src __tests__ docs` and confirm zero
      hits outside intentionally-retained historical prose, if any (design
      §8).
- [ ] Confirm `git --no-pager diff -- package.json package-lock.json` is
      empty.
- [ ] Confirm `git status --short` contains only expected files under
      `src/lib/albums/`, `__tests__/lib/albums/`,
      `__tests__/commands/manage-albums/`, `docs/`, and this spec, plus any
      preserved pre-existing changes.
- [ ] Reconcile all acceptance criteria in `requirements.md` §6 and record
      concise execution notes beneath completed phases.

---

## Execution notes

_(fill in during implementation)_