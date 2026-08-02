# Design: Copy Album Art with Organize Files

> Scope reminder: this spec touches only album organization source/tests,
> generated GraphQL schema, relevant album collections/docs, the
> album-organization skill, and this spec. No audiobook changes, source-file
> mutation, new dependencies, historical-spec edits, or `npx`.

## 1. Overview

Extend the existing plan-first pipeline with a second file kind rather than a
post-copy side effect. Organization discovery classifies direct regular files
as audio, recognized raster album art, or unsupported entries. Audio metadata
continues to determine the single effective album directory; image plans then
target that directory by basename (FR-1–FR-4).

Use a discriminated output union so album art is visible and reviewable without
inventing track metadata. Collision preparation and execution consume one
combined plan, giving images the same preflight, action, temporary-sibling, and
cleanup guarantees as audio (FR-5–FR-13).

## 2. File layout

### Modified or added files

```text
src/lib/albums/audio-files.ts                  classify accepted art for organize
src/lib/albums/album-art-planner.ts            new image plan builder
src/lib/albums/organize-files-types.ts         discriminated row/copy types
src/lib/albums/organize-files.ts               compose audio and art plans
src/lib/albums/organize-files-execution.ts     publish generic file plans safely
src/commands/manage-albums/organize-files.ts   help and dry-run wording
src/web/modules/graphql/{album.rows,schema.gql}
__tests__/lib/albums/organize-files-album-art.test.ts
__tests__/commands/manage-albums/organize-files.test.ts
__tests__/web/{controllers,graphql,mcp}*.test.ts
collections/harmonia-aquila-web/**/organize-files*.yml
docs/{album-organization,graphql,mcp-server,testing}.md
.agents/skills/album-organization/SKILL.md
```

Exact web test filenames should follow the current suite after pre-flight
inventory. Prefer focused new test files when an existing file would exceed
200 lines (NFR-5).

### Files explicitly not modified

- `src/lib/albums/{list,summarize-source-dir,validate}.ts`; their treatment of
  images remains unchanged.
- `src/commands/manage-audiobooks/**` and audiobook web surfaces.
- `package.json` and `package-lock.json`; no image parser is required.
- Historical specs, which remain evidence of earlier workflows.

## 3. Discovery and classification

Add an organization-only discovery mode to `getAudioFiles`, keeping its default
behavior unchanged for summarize and validate:

```ts
interface AudioFilesResult {
  albumArtFiles: Dirent[]
  files: Dirent[]
  targetDirectory: string
}

getAudioFiles(sourceDir, {
  acceptAlbumArt: true,
  ignoreNonAudioFiles,
})
```

`acceptAlbumArt` recognizes the FR-1 extensions case-insensitively. Recognized
images are removed from the invalid-entry set even when
`ignoreNonAudioFiles !== true`; unsupported entries remain errors or are
ignored exactly as today (FR-2). Symlinks, directories, and special files are
not treated as album art.

The existing audio `limit` and trackless-audio filter run before image
planning. If they leave no audio plan, return no album-art plan because there
is no reviewed effective album destination (FR-8).

## 4. Output contract

Replace the single row interface with a discriminated union while retaining
every current audio field:

```ts
interface OrganizationFileRow {
  action: OrganizationAction
  destination: string
  fileType: 'albumArt' | 'audio'
  filename: string
}

interface OrganizationAudioRow extends OrganizationFileRow {
  fileType: 'audio'
  album: string
  artistFilename: string
  tagChanges: MetadataFixJsonOutputRow
  // current audio fields remain required
}

interface OrganizationAlbumArtRow extends OrganizationFileRow {
  fileType: 'albumArt'
}
```

JSON, REST, and MCP return these variants directly. CLI plaintext renders one
table with blank audio-only columns for art rows. GraphQL adds required
`fileType`, keeps `action`, `filename`, and `destination` non-null, and makes
audio-only fields including `tagChanges` nullable. This loosens field
nullability without renaming the mutation or row type (FR-5, FR-6, FR-13).

Audio rows remain first in current order. Art rows are appended using
case-insensitive basename order with the original basename as a stable
tie-breaker (FR-7).

## 5. Planning pipeline

After `planOrganizationCopies` validates effective metadata and album identity,
pass its single `albumDestinationPath` plus discovered images to
`planAlbumArtCopies`. Each art plan uses:

```text
sourcePath      = <source directory>/<original basename>
destinationPath = <effective Artist/Album>/<original basename>
tagFix          = undefined
row             = { fileType: "albumArt", action, filename, destination }
```

If the audio planner produces more than one album destination it already fails,
so art is never guessed across albums. Multi-disc audio destinations may add
`Disc NN`, but the shared `albumDestinationPath` keeps art at the album root
(FR-3, FR-4).

Concatenate audio and art plans before calling destination preparation. Unique
path checks, existing-album checks, and exact-file checks therefore complete
for the whole batch before the first write (FR-9).

## 6. Execution and collision behavior

Generalize `PlannedOrganizationCopy` so `tagFix` is present only for audio.
The executor uses the existing unique temporary sibling, `copyFile`, `rename`,
and `finally` cleanup sequence for both variants. It writes and verifies tags
only when an audio tag fix exists (FR-11, FR-12).

| Strategy | Existing image destination | Dry-run / execute action |
| --- | --- | --- |
| `error` | reject the complete plan before writes | no rows returned |
| `ignore` | preserve the exact destination image | `would ignore` / `ignored` |
| `overwrite` | stage and replace only that exact image | `would overwrite` / `overwritten` |

Existing album-directory rejection under `error` remains unchanged. Neither
strategy removes unrelated files or directories. A later image publication
failure may leave earlier audio published, matching documented sequential
behavior, but the failing image's temporary sibling is removed (NFR-9).

## 7. Public surfaces and documentation

No input option changes are required. Update output typing and examples across
CLI, REST, GraphQL, and MCP. GraphQL resolver mapping remains thin because it
returns the domain rows directly; only its object field nullability and schema
change.

Update Bruno dry runs to assert an `albumArt` row where the configured fixture
contains an image. Keep every collection request non-executing. Update active
docs and `.agents/skills/album-organization/SKILL.md` so recognized art is
reviewed in the same dry run and is not described as an ignored sidecar
(FR-13, FR-14).

## 8. Test updates

| Case | Expected proof |
| --- | --- |
| mixed audio and supported images | dry run returns audio then sorted art rows |
| uppercase/common extensions | case-insensitive FR-1 classification |
| unsupported sidecar | strict error; ignored only with existing flag |
| metadata repair | art targets the effective repaired album directory |
| multi-disc album | art remains directly under album root |
| `limit: 0` / all trackless filtered | no art row and no write |
| execution | destination bytes equal image source; source bytes unchanged |
| image collision strategies | error/ignore/overwrite action and byte behavior |
| duplicate/preflight failure | no audio or image destination written |
| injected image publication failure | temporary sibling removed |
| metadata writer spy | never called for album-art rows |
| CLI/REST/GraphQL/MCP | `fileType` and nullable audio fields remain aligned |

## 9. Migration strategy

1. Capture baseline tests, output contracts, and current image rejection.
2. Add organization-only image classification and focused tests.
3. Introduce discriminated rows and album-art planning without execution.
4. Combine destination preflight and generic staged publication.
5. Update CLI and web output contracts, schema, and transport tests.
6. Update collections, documentation, and the album-organization skill.
7. Run final verification after all TypeScript edits are complete.

## 10. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Images copied into a wrong album | Medium | Derive only from the validated effective audio album path. |
| Artwork silently overwrites a destination | Medium | Include art in shared preflight; retain default `error`. |
| Multi-disc art lands in one disc | Medium | Plan from `albumDestinationPath`, never track destination dirname. |
| Existing consumers treat every row as audio | Medium | Add required discriminant; document GraphQL nullability and test all transports. |
| `ignoreNonAudioFiles` suppresses recognized art | Medium | Classify art before applying unsupported-entry ignore behavior. |
| Image failure leaves temp files | Low | Reuse staged sibling cleanup and inject failure coverage. |
| Shared discovery changes validation | Medium | Gate art acceptance behind organization-only mode and regression-test defaults. |

## 11. Verification

After every source-code file edit:

1. `npm run lint -- <modified-file>` — exit 0 (NFR-1).

After all TypeScript modifications:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/organize-files-album-art.test.ts __tests__/commands/manage-albums/organize-files.test.ts <affected-web-tests>` — exit 0.
2. `npm run lint` — exit 0.
3. `npm run build` — exit 0.
4. `npm test` — exit 0 and compare with the recorded baseline.
5. Start `npm run web:serve -- --source-dir etc --dest-dir etc --scratch-dir etc --host 127.0.0.1 --port 3000`, run the album-only dry-run Bruno requests, then stop the captured server.
6. `git status --short -- etc` — empty; no collection smoke test may mutate fixtures.
7. `git diff -- package.json package-lock.json` — empty.
8. `git diff --check` — empty, and every touched source/test file is at most
   200 lines.
9. `git --no-pager diff --stat -- src __tests__ docs collections .agents/skills/album-organization` — matches §2.

