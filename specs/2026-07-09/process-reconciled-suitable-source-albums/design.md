# Design: Process Reconciled Suitable Source Albums

> Scope reminder: this spec processes only listed candidates from `etc/1-source-files` into `etc/3-organized-files` and writes audit artifacts under the existing dated report folder. It does not modify source files, source code, or dependencies.

## 1. Overview

Use a sequential dry-run-then-execute workflow. The candidate list is generated from the reconciled audit index after moving already-organized destinations out of suitable candidates. The list is also deduplicated by resolved destination album folder so duplicate albums are blocked rather than merged.

The workflow preserves each candidate's dry-run mode. Candidates promoted by the sidecar re-evaluation must use `--ignore-non-audio-files`; strict candidates must continue using the default strict source-folder validation.

The workflow also preserves likely album art. `candidate-summary.json` includes an `albumArt` object for every candidate, populated from a recursive image scan of each source directory. Square images are treated as likely album art, with preference for filenames containing `cover`, `folder`, `front`, `album`, or `artwork`.

## 2. Candidate files

| File | Purpose | Count |
| --- | --- | ---: |
| `candidates-executable.md` | Destination-unique suitable candidates to execute | 513 |
| `candidates-blocked-duplicates.md` | Suitable candidates blocked by duplicate resolved destination | 47 |
| `candidate-summary.json` | Machine-readable candidate list, duplicate groups, and album-art references | 560 total |

## 3. Album-art summary

| Metric | Count |
| --- | ---: |
| Candidates with any image files | 515 |
| Candidates with square images | 395 |
| Candidates with likely album art | 395 |
| Executable candidates with likely album art | 354 |
| Blocked duplicate candidates with likely album art | 41 |
| Image files found | 951 |
| Square image files found | 429 |
| Likely album-art files found | 405 |

## 4. Processing workflow

For each executable candidate:

1. Read `source`, `dryRunMode`, and `finalAlbumDir` from `candidate-summary.json`.
2. Run immediate dry-run:
   - strict: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json`
   - ignore sidecars: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json --ignore-non-audio-files`
3. Save dry-run command, exit code, stdout, and stderr.
4. If dry-run succeeds, run the same command with `--execute` appended and save the execute artifact.
5. After audio execute succeeds, copy each file in `albumArt.likelyAlbumArtFiles` to the destination album folder and save an artwork-copy artifact.
6. If any command fails, or if an artwork destination filename already exists, save a blocked artifact and continue; do not repair tags, retry with overwrite behavior, or overwrite artwork.

## 5. Artifact layout

```text
reports/album-organization-audit/2026-07-09-source-dir-summaries/processing-runs/<run-id>/
  dry-runs/success/*.json
  dry-runs/failed/*.json
  execute/success/*.json
  execute/failed/*.json
  artwork/success/*.json
  artwork/failed/*.json
  blocked/*.json
  processing-summary.json
  processing-summary.md
```

## 6. Album-art copy rules

1. Copy only files listed under `albumArt.likelyAlbumArtFiles`.
2. Preserve the source image filename when copying into the destination album folder.
3. If multiple likely album-art files exist for one candidate, copy all of them unless a destination filename conflict blocks the candidate.
4. Do not copy non-square scans or other sidecars during this spec.
5. Record copied source path, destination path, dimensions, and any conflict in the processing run artifact.

## 7. Duplicate handling

Duplicate resolved album destinations are intentionally blocked. This avoids mixing multi-disc releases, remasters, duplicate quality variants, or conflicting editions into the same album folder. A future spec may choose one source, rename albums, or perform tag normalization.

## 8. Verification

1. `npm run build` exits 0 before processing.
2. Every executable candidate has an execute-success or blocked artifact.
3. Every duplicate candidate has a blocked artifact and no execute artifact.
4. Every executed candidate with likely album art has artwork-copy success or blocked artifact.
5. Remaining suitable candidates in the audit report are updated or a follow-up report notes what remains.
6. `git --no-pager diff --stat src package.json package-lock.json` is empty.
