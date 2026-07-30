# Design: Album Disc Metadata Support
> Scope reminder: this spec changes shared `manage-albums` metadata behavior,
> CLI/REST/GraphQL/MCP adapters, focused tests/Bruno requests, and related
> docs only. No real media library, `etc/**`, audiobook, dependency, root
> routing, or `npx` changes.

## 1. Overview

Introduce one normalized disc model at the album-library boundary and keep
format names out of command logic. `music-metadata` remains the reader:
`common.disk.no` maps to `discNumber` and `common.disk.of` maps to
`discTotal`. `audio-tags.ts` remains the writer and maps those values to
`node-taglib-sharp`'s `disc`/`discCount`, which handles ID3v2 `TPOS` and FLAC
Xiph fields (FR-1–FR-3).

A new focused `disc-metadata.ts` module owns pure validation, multi-disc
detection, formatting, and inference. Validation and organization feed their
selected metadata records to it after `limit`, but before filesystem checks.
This prevents concurrent metadata parsing from influencing results
(FR-6–FR-15, FR-21, NFR-6).

Disc inference is explicitly opt-in. It treats filename order as the source of
album order, splits the effective track sequence at repetitions/decreases, and
shows every proposed value in dry-run output. It never guesses from titles or
online sources and rejects unsafe combinations (FR-13–FR-19).

## 2. File layout

### New files

```text
src/lib/albums/disc-metadata.ts
__tests__/lib/albums/disc-metadata.test.ts
__tests__/lib/albums/disc-validation.test.ts
__tests__/lib/albums/disc-inference.test.ts
__tests__/web/manage-albums-disc-metadata.test.ts
__tests__/web/graphql/album-disc-metadata.test.ts
__tests__/web/mcp.manage-albums-disc-metadata.test.ts
```

### Modified files

```text
src/lib/albums/audio-tags.ts
src/lib/albums/fix-tags.ts
src/lib/albums/organization-plan.ts
src/lib/albums/organize-files.ts
src/lib/albums/summarize-source-dir.ts
src/lib/albums/validate.ts
src/commands/manage-albums/fix-tags.ts
src/commands/manage-albums/helpers/set-metadata.ts
src/web/schemas/request-schemas.ts
src/web/schemas/mcp/manage-albums.ts
src/web/controllers/manage-albums.controller.ts
src/web/modules/graphql/album.inputs.ts
src/web/modules/graphql/album.rows.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/schema.gql
src/web/servers/mcp-tools/manage-albums/fix-tags.ts
__tests__/lib/albums/audio-tags.test.ts
__tests__/lib/albums/fix-tags.test.ts
__tests__/lib/albums/summarize-source-dir.test.ts
__tests__/lib/albums/validate.test.ts
__tests__/commands/manage-albums/helpers/set-metadata.test.ts
__tests__/commands/manage-albums/{fix-tags,organize-files*,summarize-source-dir,validate}.test.ts
collections/harmonia-aquila-web/manage-albums/*.yml
collections/harmonia-aquila-web/graphql/album-*.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-*.yml
docs/album-organization.md
docs/fix-tags-set-metadata.md
docs/graphql.md
docs/mcp-server.md
docs/testing.md
```

Only affected collection requests and tests are changed. Split existing files
before adding cases when the result would exceed 200 lines (NFR-5).

### Files explicitly NOT modified

- `package.json` and `package-lock.json`: installed libraries already expose
  all required reader/writer APIs.
- `src/lib/audiobooks/**`, `src/commands/manage-audiobooks/**`, and audiobook
  web code: album-only feature.
- `src/web/providers/path-resolver.ts` and web bootstrap: roots and transport
  behavior do not change.
- `etc/**` and real audio fixtures: tests use mocks or temporary generated
  fixture copies.

## 3. Canonical disc model

```ts
export interface DiscMetadata {
  discNumber: number | null
  discTotal: number | null
}

export interface DiscTrackMetadata extends DiscMetadata {
  filename: string
  trackNumber: number | null
}
```

`readDiscMetadata(metadata.common.disk)` normalizes missing library values to
`null` and retains non-integer/out-of-range values long enough for deterministic
validation. Pure helpers return structured issues rather than writing rows
directly:

| Helper | Responsibility |
| --- | --- |
| `formatDiscNumber` | Empty string for `null`; otherwise minimum two digits. |
| `isMultiDiscSet` | True when any number or total is greater than 1. |
| `validateDiscSet` | Numeric, completeness, continuity, total, and tuple checks. |
| `inferDiscSet` | Filename-order run splitting and proposed number/total map. |

`DiscSetIssue` includes an issue code, message, and implicated filenames.
`validate.ts` converts these to row issues; `organize-files.ts` and
`fix-tags.ts` convert them to one sorted `UserInputError`. This shares policy
without coupling the three output shapes (FR-3, FR-6, FR-7, NFR-6).
## 4. Validation semantics

Validation first creates rows carrying raw numeric disc fields privately, then
applies ordinary missing-field issues and `validateDiscSet`. Destinations are
computed only after disc validation.

| Selected set | Result |
| --- | --- |
| No disc values; unique tracks | Valid legacy album. |
| No disc values; repeated track | Repeated rows get `missing disc number`. |
| Any disc number; another row missing it | Missing row is invalid. |
| Same disc + same track twice | Both rows get `duplicate disc and track number: D/T`. |
| Totals partly absent or inconsistent | Implicated rows get deterministic total issues. |
| Numbers `1,3` without `2` | Disc rows get `non-contiguous disc numbers: 1, 3`. |
| Disc 3 of 2 | Row gets `disc number exceeds disc total: 3/2`. |

After invalid rows receive issues, duplicate destination checks operate only on
computable destinations. Existing single-album and single-artist guards still
receive the same album/artist identities and remain set-wide errors. Disc
numbers do not create separate albums (FR-5–FR-8).
## 5. Destination planning

Extend `getAlbumDestination` with optional disc context:

```ts
getAlbumDestination(
  artist, album, trackNumber, title, sourceFilename,
  { discNumber, multiDisc },
)
```

| Context | Relative destination |
| --- | --- |
| Legacy/no multi-disc evidence | `Artist/Album/01 - Title.ext` |
| Multi-disc, disc 1 | `Artist/Album/Disc 01/01 - Title.ext` |
| Multi-disc, disc 2 | `Artist/Album/Disc 02/01 - Title.ext` |

The selected set computes `multiDisc` once, so every row in a multi-disc run
uses the same layout. Destination collision detection continues to compare
absolute planned file paths and now naturally distinguishes discs. Album
destination existence checks remain at `Artist/Album`, not each disc folder,
so execute mode retains its all-or-nothing album safety (FR-8–FR-12).
## 6. Fix-tags inference and explicit metadata

### 6.1 Inference algorithm

For `discStrategy = infer`:

1. Apply `limit`, parse all selected metadata, and sort by filename.
2. Reject any missing/non-positive track number and reject `resetTrack`.
3. Walk the sequence with disc 1. If the next track is greater than the
   previous track, keep the disc; otherwise increment the disc.
4. Require at least two inferred discs and set every selected row's
   `discTotal` to the inferred maximum.
5. Compare existing disc metadata. Preserve values that exactly match; fill
   missing values only when the remaining existing values are compatible; fail
   on any contradiction.
6. Return proposed values by source path, independent of parse concurrency.

Example:

```text
filename order tracks:  1  2  3  1  2  3
inferred discs:         1  1  1  2  2  2
inferred total:         2  2  2  2  2  2
```

For tracks `4, 4`, the second repetition begins disc 2 as explicitly required.
This deterministic rule can only reflect filename ordering; documentation MUST
tell users to inspect dry-run output before execute (FR-14–FR-16).
### 6.2 Set-metadata

Extend `SetMetadataRecord`:

```ts
interface SetMetadataRecord {
  // existing required fields
  discNumber?: number
  discTotal?: number
}
```

JSON keys and CSV headers use `discNumber` and `discTotal`. Existing five-column
inputs remain valid. Parsers reject blank-present, fractional, zero, negative,
total-without-number, and number-greater-than-total values with row/record
context. Reconciliation remains filename-based. If any reconciled record has a
disc field, fix-tags includes old/new disc fields in every affected output row
and validates the resulting selected disc set before copying (FR-17, FR-18).
### 6.3 Tag write and verification

Extend `AudioTagFix` with `discNumber` and `discTotal`. `writeAudioTagFix`
assigns `audioFile.tag.disc` and `audioFile.tag.discCount` before the existing
single save. Unit tests use MP3/ID3v2 and FLAC/Xiph tag doubles to assert the
format mapping.

After an execute write containing disc changes, fix-tags reuses
`music-metadata.parseFile` to assert the destination's normalized
`common.disk.no/of` values. Verification errors include the destination
filename and requested values, without exposing configured roots through web
adapters (FR-2, FR-19).

## 7. Public surface mapping

| Surface | Additive input | Additive output |
| --- | --- | --- |
| CLI fix-tags | `--disc-strategy infer` | old/new disc fields |
| CLI summary/validate/organize | None | disc number/total |
| REST fix-tags | `discStrategy` | old/new disc fields |
| REST summary/validate/organize | None | serialized disc fields |
| GraphQL fix-tags | `discStrategy` | nullable old/new `Int` fields |
| GraphQL summary/validate/organize | None | non-null formatted `String` fields |
| MCP fix-tags | optional `discStrategy` | JSON old/new disc fields |
| MCP summary/validate/organize | None | JSON formatted disc fields |

Resolvers/controllers/MCP tools only pass through `discStrategy`; inference
stays in `fixAlbumTags`. GraphQL decorators regenerate the checked-in SDL.
Existing names, defaults, paths, execute behavior, and error adapters remain
unchanged (FR-20, NFR-8).
## 8. Test updates

| Area | Required coverage |
| --- | --- |
| Pure disc helper | Formatting, legacy set, repetitions, tuples, totals, gaps, deterministic inference. |
| Tag writer | MP3 `TPOS` and FLAC fields through taglib properties; save/dispose. |
| Summary | Missing, `1`, and `2/3` normalized output. |
| Validation | Every FR-6 matrix row; destination and issue ordering. |
| Organization | Legacy path unchanged; disc folders; preflight no-write; same track on different discs. |
| Fix-tags | Default no change; inference dry-run/execute; conflicts; persistence verification. |
| Set-metadata | Backward-compatible JSON/CSV and optional field validation. |
| CLI | Option registration, rows, invalid strategy, Commander errors. |
| REST/GraphQL/MCP | Schema pass-through, additive rows, error parity, unchanged roots/annotations. |
| Bruno/docs | Safe dry runs and response assertions; no execute request. |

Do not add binary fixtures to the repository. Existing mocks cover most domain
tests; tag persistence tests MAY create temporary copies from an existing small
test asset if available, otherwise use focused taglib/reader doubles.
## 9. Migration strategy

1. Add and test the pure disc model, formatter, validator, and inference.
2. Extend the tag writer and set-metadata parser with focused tests.
3. Add summary and validation fields/policy.
4. Add disc-aware destination planning and organization behavior.
5. Add fix-tags strategy, planning rows, writes, and verification.
6. Wire REST, GraphQL, MCP, generated SDL, and adapter tests.
7. Update safe Bruno requests and documentation.
8. Run focused checks, final lint/build/tests, and scope verification.
## 10. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Filename order does not reflect disc order | Medium | Opt-in only, deterministic dry-run, explicit documentation, no title-based guesses. |
| Partial disc metadata is silently corrupted | Medium | Reconcile inferred/existing values and reject contradictions before copy. |
| Multi-disc paths break single-disc libraries | Low | Gate `Disc DD` on set-wide multi-disc evidence and lock legacy paths in tests. |
| Disc totals differ across tag formats | Medium | Read only normalized fields and verify writes through the normalized reader. |
| Validation and organization drift | Medium | Share pure disc-set validation and destination context helpers. |
| API contracts become inconsistent | Medium | Add one parity test suite across REST, GraphQL, and MCP schemas/rows. |
| Concurrent parsing changes inference | Low | Sort parsed records before all inference and error construction. |
| Existing large files exceed 200 lines | High | Extract focused modules/tests before adding behavior. |
## 11. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/disc-metadata.test.ts __tests__/lib/albums/disc-validation.test.ts __tests__/lib/albums/disc-inference.test.ts`
2. `./node_modules/.bin/vitest run __tests__/lib/albums/audio-tags.test.ts __tests__/lib/albums/fix-tags.test.ts __tests__/lib/albums/summarize-source-dir.test.ts __tests__/lib/albums/validate.test.ts`
3. `./node_modules/.bin/vitest run __tests__/commands/manage-albums`
4. `./node_modules/.bin/vitest run __tests__/web/manage-albums-disc-metadata.test.ts __tests__/web/graphql/album-disc-metadata.test.ts __tests__/web/mcp.manage-albums-disc-metadata.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Run affected Bruno requests against a temporary three-root `web serve`
   instance with execute omitted, then stop the captured process.
5. `git --no-pager diff --stat -- etc package.json package-lock.json src/lib/audiobooks src/commands/manage-audiobooks`
   shows no changes introduced by this spec.
