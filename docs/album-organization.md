# Album organization processing

Album organization work is driven by dated specs and audit reports rather than ad hoc copy commands.

## Current suitable-candidate processing spec

- Spec: `specs/2026-07-09/process-suitable-source-albums/`
- Audit report: `reports/album-organization-audit/2026-07-09-source-dir-summaries/album-organization-audit-2026-07-09.md`
- Candidate source: `reports/album-organization-audit/2026-07-09-source-dir-summaries/source-dir-summaries-json/index.json`

The current spec covers 65 refined suitable candidates: 63 are executable immediately, and 2 are blocked because both resolve to `Cascada/Cascada - Original Me (Includes Greatest Hits)`. Processing must rerun `organize-files` dry-run immediately before `--execute` for each candidate and must preserve `etc/1-source-files` as read-only input.

## Safe command pattern

```sh
npm run build
./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json
./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json --execute
```

Do not supply metadata-repair options during this suitable-candidate pass, and do not use overwrite behavior or manual merges for duplicate destination album folders.

`organize-files` accepts one normalized album directory per run by default. It
fails with `Multiple albums found:` when the selected files resolve to multiple
albums, and it still fails when one normalized album directory resolves for
multiple normalized artist directories. Both album and artist conflicts are
checked after disc-metadata validation and missing metadata, but before
destination inspection, duplicate-destination checks, or copying. Treat either
result as a metadata or source-selection issue unless the multiplicity is
intended.

Pass `--allow-multiple-albums` (REST, GraphQL and MCP: `allowMultipleAlbums`)
when it is intended. One run then produces one `Artist/Album` tree per resolved
album. The flag turns off **both** guards above, because both encode
one-album-per-run and neither condition is a destination collision — the artist
is part of the path, so two artists sharing an album title resolve to two
separate directories. Consequences worth understanding before using it:

- Disc metadata is validated per destination album rather than across the whole
  run, so two albums that each start at track 1 organize normally. A repeated
  track number *within* one album still fails with the usual duplicate-track
  error. Multi-disc filename prefixes are likewise decided per album: a two-disc
  album keeps `DTT - Title.ext` while a single-disc album in the same run keeps
  `TT - Title.ext`.
- Adjacent album art has no unambiguous album to belong to, so when more than one
  album resolves every image is reported as `fileType: "albumArt"` with
  `action: "would exclude"` (or `excluded`) and an empty `destination`, and is
  never copied. `--ignore-non-audio-files` does **not** drop album art; remove
  the images from the source, or organize each album separately, if you need them
  placed. With exactly one album resolved, art placement is unchanged.
- An album whose tracks disagree on `artist` will now split silently across
  artist directories instead of erroring. Nothing in the tags distinguishes that
  from two distinct albums sharing a title, so review the dry run — or run
  `manage-albums validate`, which keeps both guards unconditionally and has no
  such flag. A source that `organize-files --allow-multiple-albums` accepts will
  still be rejected by `validate`; that asymmetry is intentional.
- The flag requires a single `--source-dir`. Combined with `--source-dirs` it
  fails with `--allow-multiple-albums requires sourceDir`, because concatenation
  derives disc numbers from directory order and exists to build exactly one album.
- `--limit` still truncates the alphabetically ordered file list *before* albums
  are resolved, so a limited multi-album run can select part of an album. The dry
  run shows exactly which tracks were chosen.
- `--reset-track` still numbers per album **title**, so where one title yields two
  destinations the numbering continues across both.

Execution is sequential and per-file atomic, but a multi-album run is not atomic
as a whole: if it fails partway, earlier albums are already written and the retry
fails on the existing directories. Re-run with `--destination-strategy ignore`
after reviewing the plan.

Direct regular image files beside the album audio are included in the same
plan when their extensions are `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`,
`.png`, `.tif`, `.tiff`, or `.webp` (case-insensitive). Image rows have
`fileType: "albumArt"` and target the effective `Artist/Album` root, including
for multi-disc albums; audio rows have `fileType: "audio"`. Other sidecars,
directories, and symlinks remain errors unless `--ignore-non-audio-files` is
explicit. Collision strategy and preflight cover the combined audio-and-art
plan before execution writes anything.

Run `manage-albums validate` before organization. Validation applies the same
one-album-per-run and album-to-artist collision rules unconditionally — it has no
`--allow-multiple-albums` equivalent — so successful validation cannot hide a
layout conflict that a default `organize-files` run would reject. Rows without
a computable destination and exact duplicate file destinations remain reported
as invalid validation rows instead of contributing album identities.

## Multi-disc metadata

MP3 files store disc number/total in ID3v2 `TPOS` (`N` or `N/M`); FLAC uses
`DISCNUMBER` and `DISCTOTAL`. Summary and validation rows expose normalized
`discNumber` and `discTotal` values. Disc metadata may be wholly absent when
selected track numbers are unique. Repeated track numbers require complete,
contiguous effective disc numbers; without them, validation and organization
fail with `missing disc number`. Duplicate `(discNumber, trackNumber)` pairs,
partial metadata, orphan totals, and inconsistent totals are invalid.
When repeated tracks activate this restriction, `organize-files` groups the
duplicate track numbers and filenames in its error. Use `--set-metadata` with a
whole-album JSON/CSV file in the CLI, or inline `setMetadata` records in REST,
GraphQL, and MCP, when numbering is incorrect. Otherwise use explicit
`--disc-strategy infer` only when the repeats are genuine disc boundaries.

Summary rows expose the audio characteristics `bitrate`, `sampleRate`, and
`bitDepth`. `bitDepth` is empty for MP3 and other lossy sources: bits-per-sample
is a PCM concept, so an empty value is correct output, not a defect. It reports
how the file is encoded, not the depth of the master it came from — a 16-bit
source padded to 24 bits reports `24-bit`. Treat it as evidence when checking a
hi-res claim, not proof of one.

Single-disc albums retain `Artist/Album/TT - Title.ext`. A set with a disc
number or total greater than 1 embeds the disc number directly in the track
filename, adjacent to the track number, as `Artist/Album/DTT - Title.ext`.
Disc digits are zero-padded to the width of the disc total (minimum one
digit) and the track number keeps its two-digit padding, so a two-disc album
yields `101 - Title.ext` (disc 1, track 1) and `201 - Title.ext` (disc 2,
track 1), while a 22-disc set yields `0301 - Title.ext` (disc 3, track 1) and
`2205 - Title.ext` (disc 22, track 5). No `Disc DD` subdirectory is ever
created. To repair a filename-ordered source set,
add `--disc-strategy infer` to the `organize-files` dry run. Inference is never
automatic: without the flag, repeated tracks remain invalid. Inference starts
a new disc whenever the next track number repeats or decreases; review every
`newDiscNumber`/`newDiscTotal` before adding `--execute`.

Use `--disc-strategy concatenate` only with ordered `--source-dirs` when
multiple flat source folders already represent one album. Concatenation requires
at least two unique directories. Directory position defines disc number and the
directory count defines disc total: the first of two inputs is disc `1/2`, and
the second is `2/2`. Local track numbers are preserved. Correct disc tags remain
unchanged; missing, partial, or conflicting values are set on destination copies
from the reviewed directory order. MP3 output stores `N/M` in ID3v2 `TPOS`, and
FLAC output stores the equivalent `DISCNUMBER` and `DISCTOTAL` values.

Concatenation plans one flat `Artist/Album` directory whose filenames carry the
disc number derived from directory order, exactly as any other multi-disc set:

```sh
harmonia-aquila manage-albums organize-files \
  --source-dirs "/music/Disc 1" "/music/Disc 2" \
  --dest-dir "/music/organized" \
  --disc-strategy concatenate \
  --album-art-strategy first \
  --format json
```

For example, local tracks `1,2` and `1` keep their local numbering, are tagged
`1/2,1/2,2/2`, and land at `101 - …`, `102 - …`, and `201 - …`. Because the
disc number is part of the filename, a track number repeated across discs no
longer collides even when the titles are identical; genuine duplicates within
one disc remain errors. Concatenation rejects `--limit`, `--reset-track`, and
`--ignore-audio-files-without-tracks`.
This behavior supersedes the initial global-track/cleared-disc concatenate
semantics.

`--set-metadata` (CLI file/CSV, or inline `setMetadata` records in REST,
GraphQL, and MCP) is supported with `--source-dirs`, which is what makes fully
tagless multi-disc sources organizable: a record's `trackNumber` becomes the
local sort/validation fallback whenever a file has no embedded track tag, and
`artist`/`album`/`title`/`trackNumber` apply to concatenated output exactly as
they do for a single `--source-dir`. Three constraints apply only in
concatenate mode:

- Records **must not** include `discNumber` or `discTotal` — disc identity
  always comes from `--source-dirs` order, never from record content.
- A bare filename repeated across `--source-dirs` entries **must** be
  disambiguated by `sourceIndex` on each of its records — the 1-based
  position of the directory that record targets. Omitting it is rejected
  before any write, naming the filename and every directory holding it.
  Filenames unique across all directories need no `sourceIndex`, and it is
  rejected outside concatenate mode.
- Every file across every directory needs exactly one matching record, and
  every record needs exactly one matching file, checked against the combined
  set of all directories (not directory-by-directory).

An optional `year` (integer 1000–9999) is **not** subject to the first
constraint: it carries no disc identity, so it is permitted in concatenate mode
as well as for a single `--source-dir`. It is set-only — omitting it leaves the
source year untouched — and `tagChanges` reports the `year`/`newYear` pair. Use
it to correct reissue pressings whose tags carry the remaster year rather than
the original release year.

All three checks run before any destination write, alongside the existing
disc-collision and album-art-collision preflight.

When concatenating, adjacent recognized album art is selected per resolved album
root separately from the destination collision strategy. If two source folders
would place art at the same destination, supply `--album-art-strategy first`,
`last`, or `neither`; otherwise the dry run fails and lists every colliding art
source. Dry-run and execute output include `sourceDirectory` for concatenated
rows so repeated basenames remain unambiguous, and unselected art appears as
`would exclude` or `excluded`. Always review the full dry run before `--execute`.

## Reconciled suitable-candidate processing spec

- Spec: `specs/2026-07-09/process-reconciled-suitable-source-albums/`
- Source report: `reports/album-organization-audit/2026-07-09-source-dir-summaries/album-organization-audit-2026-07-09.md`
- Executable candidates: 513
- Duplicate-destination blocked candidates: 47

Use each candidate's listed dry-run mode. Candidates promoted from sidecar folders require `--ignore-non-audio-files`; strict candidates should not use that flag unless their candidate row says so.

## New source-album processing spec

- Spec: `specs/2026-07-09/process-new-source-albums/`
- Source audit: `reports/album-organization-audit/2026-07-09-new-source-files-audit/new-source-files-audit.md`
- Reanalysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/reanalyze-overclock-remix-parent-20260709-165454/`
- Executable candidates: 7
- Blocked candidates: 34

This spec covers the current OC ReMix-style source folders in `etc/1-source-files`. Run every listed dry-run with `--ignore-non-audio-files --artist-filename-strategy albumartist`, and execute only candidates that resolve under `OverClocked ReMix/`. Its historical manual album-art copy step is obsolete: recognized adjacent images now appear in and execute with the combined organization plan. MP3/mp3s alternates are blocked when a FLAC/flacs source resolves to the same destination; same-quality FLAC disc folders that collapse into the same `OverClocked ReMix/<Album>` destination are blocked until multi-disc merge handling is designed; Blood on the Asphalt, Chrono Symphonic, and Super Metroid entries remain blocked until metadata is repaired.

## Missing OC Remix source-album processing spec

- Spec: `specs/2026-07-09/process-missing-ocremix-source-albums/`
- Source analysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/missing-albums-spec-analysis-20260709-191046/`
- Executable workflows: 3
- Blocked workflows: 11

This historical spec used staged tag repairs before organization. The current command accepts `--set-album-artist "OverClocked ReMix"` and `--set-album "Xenogears - Humans + Gears"` directly on `organize-files`, so repaired metadata and final paths appear in one dry run.

## Chrono/Blood tagged-album processing spec

- Spec: `specs/2026-07-09/process-chrono-blood-tagged-albums/`
- Source analysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/chrono-blood-spec-analysis-20260709-193925/`
- Executable workflows: 2
- Blocked workflows: 0

This historical spec combined Chrono Symphonic FLAC CD1/CD2 into audio-only staging before tag repair and organization. The current workflow supplies the same album-artist, album strategy, and track-reset options directly to `organize-files` for a single reviewed plan.
