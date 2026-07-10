# Design: process Ozzy Osbourne albums

## Inputs and outputs

| Item | Path |
|---|---|
| Source package | `etc/1-source-files/Ozzy Osbourne - Discography [FLAC Songs] [PMEDIA] ⭐️` |
| Organized destination | `etc/3-organized-files/Ozzy Osbourne` |
| Run artifacts | `reports/album-organization-audit/2026-07-10-ozzy-osbourne-processing/<run-id>/` |
| Candidate inventory | `candidate-summary.json` in the run directory |
| Staging directories | `audio-only/`, `fixed-tags/`, `dry-run/`, `execute/`, `artwork/`, `quarantine/` |

The source package has 25 top-level album candidates, 26 flat workflows, and
258 FLAC files. The initial inventory includes standard albums, expanded
editions, compilations, live releases, cover versions, singles, and a duplicate 2020 release at
16-bit/44.1 kHz and 24-bit/48 kHz. Candidate selection must be based on
metadata and track-list review, not directory names alone.

## Candidate and duplicate policy

1. Build one candidate row per top-level album directory. Discover nested
   `Disc N` folders and represent each disc as a separate workflow where
   filenames or track numbers would otherwise collide.
2. Treat the two `Ordinary Man` folders as alternate sources for one album
   destination. Prefer the 24-bit/48 kHz source if its track list and metadata
   are complete; retain the other as blocked duplicate evidence.
3. Treat anniversary and expanded editions as distinct destinations only when
   their additional tracks or release identity are materially different.
   Otherwise block the lower-quality or redundant candidate pending review.
4. The two `The Essential Ozzy Osbourne` disc workflows MUST use
   `The Essential Ozzy Osbourne (Disc 1)` and `The Essential Ozzy Osbourne
   (Disc 2)` as distinct destination album names. This preserves the source
   disc boundaries and prevents duplicate `01 - ...` filenames. The incomplete
   `LIVE & LOUD/Disc 1` workflow is blocked pending the missing source tracks.
5. Compilations (`The Essential Ozzy Osbourne`, `Memoirs of a Madman`,
   `Tribute`) and live releases MUST retain their own album folders and MUST
   not be merged into studio albums.
6. Any track-list mismatch, duplicate destination, unreadable file, or
   ambiguous edition MUST be written to the candidate report and quarantined
   rather than discarded.

## Staging and metadata flow

For each selected workflow, copy only supported audio files into a flat
`audio-only/<workflow-id>/` directory. Preserve the source-relative filename
mapping in the candidate report. Copy the selected cover into the run's
`artwork/` area without modifying the source.

First inspect with:

```sh
./build/dist/index.js summarize-source-dir \
  --dir-name "$RUN/audio-only/$WORKFLOW_ID" --format json
```

If metadata already satisfies the final naming plan, organize from the staged
input. If artist, album artist, album, title, or track number needs repair,
create a complete CSV manifest and use:

```sh
./build/dist/index.js fix-tags \
  --source-dir "$RUN/audio-only/$WORKFLOW_ID" \
  --dest-dir "$RUN/fixed-tags/$WORKFLOW_ID" \
  --set-metadata "$RUN/metadata/$WORKFLOW_ID.csv" \
  --format json
```

Review `newArtists`, `newAlbum`, `newTrackNumber`, and `newTitle` before adding
`--execute`. Do not combine `--set-metadata` with `--set-artist`,
`--set-album`, `--album-strategy`, or `--reset-track`.

## Organization flow

Use `fixed-tags/<workflow-id>` when tag repair was required, otherwise use
`audio-only/<workflow-id>`. Dry-run and review the exact destination plan:

```sh
./build/dist/index.js organize-files \
  --source-dir "$PROCESS_SOURCE" \
  --dest-dir etc/3-organized-files \
  --format json \
  --artist-filename-strategy albumartist
```

Execute only the reviewed, collision-free plan by adding `--execute`. If
`albumartist` does not resolve to `Ozzy Osbourne`, block the workflow and repair
the staged tags first. Do not use overwrite options.

After successful organization, copy the selected image as
`Ozzy Osbourne/<Album>/cover.jpg` only if that destination file does not exist.
Record the source image, destination, and copy result in the run summary.

## Validation and reporting

The run MUST validate that each manifest has the header
`filename,artist,album,trackNumber,title`, exactly covers its staged audio
directory, uses positive track numbers, and has nonempty titles. The report
MUST include source and output counts, selected strategy, final destination,
dry-run result, execute result, artwork result, and blocker reason.

Required verification commands:

```sh
npm run build
npm run lint
./build/dist/index.js summarize-source-dir --dir-name "$AUDIO_DIR" --format json
./build/dist/index.js organize-files --source-dir "$PROCESS_SOURCE" \
  --dest-dir etc/3-organized-files --format json \
  --artist-filename-strategy albumartist
```

No command may use `npx`. The final report must confirm that the source tree
was unchanged and that no destination collision was bypassed.

## Risk table

| Risk | Likelihood | Mitigation |
|---|---|---|
| Nested discs are rejected or collide | High | Stage each disc flat and use distinct workflow/destination names |
| Duplicate or alternate editions merge incorrectly | High | Compare track lists and quality; block uncertain candidates |
| Missing titles prevent useful filenames | Medium | Require complete `--set-metadata` manifests |
| Existing organized albums collide | Medium | Dry-run against the real destination immediately before execute |
| Artwork is a sidecar or wrong image | Medium | Select and record front artwork separately; copy after audio success |
| Corrupt or unsupported audio blocks a batch | Medium | Isolate the workflow and quarantine it without changing source |
