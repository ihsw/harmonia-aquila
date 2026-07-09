# Design: Process Reconciled Suitable Source Albums

> Scope reminder: this spec processes only listed candidates from `etc/1-source-files` into `etc/3-organized-files` and writes audit artifacts under the existing dated report folder. It does not modify source files, source code, or dependencies.

## 1. Overview

Use a sequential dry-run-then-execute workflow. The candidate list is generated from the reconciled audit index after moving already-organized destinations out of suitable candidates. The list is also deduplicated by resolved destination album folder so duplicate albums are blocked rather than merged.

The workflow preserves each candidate's dry-run mode. Candidates promoted by the sidecar re-evaluation must use `--ignore-non-audio-files`; strict candidates must continue using the default strict source-folder validation.

## 2. Candidate files

| File | Purpose | Count |
| --- | --- | ---: |
| `candidates-executable.md` | Destination-unique suitable candidates to execute | 513 |
| `candidates-blocked-duplicates.md` | Suitable candidates blocked by duplicate resolved destination | 47 |
| `candidate-summary.json` | Machine-readable candidate list and duplicate groups | 560 total |

## 3. Processing workflow

For each executable candidate:

1. Read `source`, `dryRunMode`, and `finalAlbumDir` from `candidate-summary.json`.
2. Run immediate dry-run:
   - strict: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json`
   - ignore sidecars: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json --ignore-non-audio-files`
3. Save dry-run command, exit code, stdout, and stderr.
4. If dry-run succeeds, run the same command with `--execute` appended and save the execute artifact.
5. If any command fails, save a blocked artifact and continue; do not repair tags or retry with overwrite behavior.

## 4. Artifact layout

```text
reports/album-organization-audit/2026-07-09-source-dir-summaries/processing-runs/<run-id>/
  dry-runs/success/*.json
  dry-runs/failed/*.json
  execute/success/*.json
  execute/failed/*.json
  blocked/*.json
  processing-summary.json
  processing-summary.md
```

## 5. Duplicate handling

Duplicate resolved album destinations are intentionally blocked. This avoids mixing multi-disc releases, remasters, duplicate quality variants, or conflicting editions into the same album folder. A future spec may choose one source, rename albums, or perform tag normalization.

## 6. Verification

1. `npm run build` exits 0 before processing.
2. Every executable candidate has an execute-success or blocked artifact.
3. Every duplicate candidate has a blocked artifact and no execute artifact.
4. Remaining suitable candidates in the audit report are updated or a follow-up report notes what remains.
5. `git --no-pager diff --stat src package.json package-lock.json` is empty.
