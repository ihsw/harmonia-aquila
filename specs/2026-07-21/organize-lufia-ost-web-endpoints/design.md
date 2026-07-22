# Design: Organize Lufia OST via Web Endpoints

> Scope reminder: this spec touches only `bin/`, optional run artifacts under
> `reports/album-organization-runs/2026-07-21-lufia-ost-web/`, this spec
> checklist, and the newly organized destination files under
> `etc/albums/3-organized-files/**`. No TypeScript, package metadata, source
> album edits, Bruno execution path, or `npx`.

## 1. Overview

Use a curl-first operational workflow. The scripts should follow the lifecycle
pattern already used by `bin/summarize-album-source-files-web.sh` and
`bin/validate-album-source-files-web.sh`: resolve the repository root, start
`node . web serve` with album source/destination roots, wait until an endpoint
responds, call the target endpoint with `curl`, pretty-print JSON, print server
logs, and stop the captured server PID with a trap (FR-2, FR-8, FR-9).

The organization workflow has four web calls in order: validate, summarize,
organize dry-run, organize execute. Validation and dry-run are gates; execution
must not happen if validation rows contain issues, if dry-run exits non-zero, or
if the dry-run response cannot be parsed as the expected JSON array (FR-3
through FR-6). Source preservation and destination-collision behavior are left
to the existing web/domain implementation, with the shell workflow treating any
non-2xx response as a blocker (NFR-4, NFR-6).

Because the user requested `etc/albums/1-source-files/lufia ost` but the tree
inspection showed `etc/albums/1-source-files/lufia2 ost`, the first execution
step must confirm the exact source directory. If the requested path remains
absent, the implementing agent must stop and ask whether to use the observed
alternate; it must not silently organize `lufia2 ost` (FR-1).

## 2. File layout

### Modified/new files

```text
bin/organize-album-source-files-web.sh                 (new generic curl workflow)
bin/organize-lufia-ost-web.sh                          (new pinned wrapper after source confirmation)
reports/album-organization-runs/2026-07-21-lufia-ost-web/
  validate.json                                        (optional captured output)
  summarize.json                                       (optional captured output)
  organize-dry-run.json                                (optional captured output)
  organize-execute.json                                (optional captured output)
specs/2026-07-21/organize-lufia-ost-web-endpoints/tasks.md
etc/albums/3-organized-files/**                        (new organized Lufia destination files)
```

### Files explicitly NOT modified

- `etc/albums/1-source-files/**`: read-only source input.
- `src/**` and `__tests__/**`: endpoints already exist; this is an operational
  spec, not an implementation change.
- `package.json` and `package-lock.json`: no new dependencies.
- Existing `bin/summarize-album-source-files-web.sh` and
  `bin/validate-album-source-files-web.sh`: use them as examples; do not change
  them unless a directly blocking bug is found.

## 3. Script design

### 3.1 Generic organizer script

Create `bin/organize-album-source-files-web.sh` with usage:

```sh
./bin/organize-album-source-files-web.sh <dir-name> [--execute]
```

Behavior:

| Mode | Web calls | Write behavior |
| ---- | --------- | -------------- |
| no `--execute` | `/validate`, `/summarize-source-dir`, `/organize-files` dry-run | No destination writes. |
| `--execute` | `/validate`, `/summarize-source-dir`, `/organize-files` dry-run, `/organize-files` execute | Writes only if all gates pass. |

The script should:

1. Default `SOURCE_DIR=etc/albums/1-source-files` and
   `DEST_DIR=etc/albums/3-organized-files`, with the same environment override
   names as the current scripts.
2. Use `curl --get --data-urlencode` for validate/summarize GET requests.
3. Use `curl --request POST --header 'Content-Type: application/json'` for
   `/manage-albums/organize-files`.
4. Build POST JSON with Node to avoid unsafe shell string interpolation for
   paths containing spaces.
5. Pretty-print every JSON response with Node and optionally tee it into the run
   artifact directory.
6. Parse validation output and abort unless every row is valid with no issues.

### 3.2 Lufia wrapper

Create `bin/organize-lufia-ost-web.sh` as a small wrapper around the generic
script after the source path decision is resolved:

```sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
"$SCRIPT_DIR/organize-album-source-files-web.sh" "lufia ost" "$@"
```

If the approved source is `lufia2 ost`, the wrapper must use that exact string
and the decision should be recorded in `tasks.md` notes before execution.

## 4. Endpoint contracts

| Step | Method/path | Required params/body |
| ---- | ----------- | -------------------- |
| Readiness | `GET /manage-albums/validate` | `dirName=<dir>`, `ignoreNonAudioFiles=true`, `limit=0` |
| Validate | `GET /manage-albums/validate` | `dirName=<dir>`, `ignoreNonAudioFiles=true` |
| Summarize | `GET /manage-albums/summarize-source-dir` | `dirName=<dir>`, `ignoreNonAudioFiles=true` |
| Dry-run organize | `POST /manage-albums/organize-files` | `{ "ignoreNonAudioFiles": true }` |
| Execute organize | `POST /manage-albums/organize-files` | `{ "ignoreNonAudioFiles": true, "execute": true }` |

`organize-files` uses the configured `web serve --source-dir` and
`--dest-dir`; its request body intentionally does not include source/dest root
overrides. If the endpoint currently organizes the entire configured source root
rather than a subdirectory, the script must not execute until a safe subdir
strategy is confirmed. The preferred safe approach is to start `web serve` with
`--source-dir "etc/albums/1-source-files/<confirmed-lufia-dir>"` for organize
calls and use `dirName=.` for validate/summarize.

## 5. Execution workflow

1. Confirm source path:
   - `test -d "etc/albums/1-source-files/lufia ost"`
   - If absent, inspect `etc/albums/1-source-files` and ask before using
     `lufia2 ost`.
2. Run the generic script without `--execute` for the confirmed source dir and
   inspect saved `validate.json`, `summarize.json`, and
   `organize-dry-run.json`.
3. Confirm the dry-run destinations are all under the expected Lufia album
   folder(s) beneath `etc/albums/3-organized-files`.
4. Run the generic script with `--execute`.
5. Compare source and destination file counts, and record the final destination
   paths in the task notes.

## 6. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Requested source name is absent | High | Stop before execution and ask whether `lufia2 ost` is intended. |
| Organize endpoint acts on configured root, not query subdir | High | Start `web serve` with the confirmed Lufia directory as source root for organize scripts. |
| Existing destination collision blocks execution | Medium | Treat non-2xx dry-run as blocked; do not overwrite or delete. |
| JSON shell quoting breaks paths with spaces | Medium | Generate JSON bodies with Node, not manual string concatenation. |
| Server remains running after failure | Low | Use trap cleanup and verify port is closed after each run. |
| Source files are accidentally modified | Low | Use only read-only validate/summarize plus copy-only organize endpoint; verify source diff/status after run. |

## 7. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1). This spec should not require source code edits.

Script checks:

1. `bash -n bin/organize-album-source-files-web.sh`
2. `bash -n bin/organize-lufia-ost-web.sh`
3. `./bin/organize-album-source-files-web.sh "<confirmed-lufia-dir>"` — dry-run
   exits 0 and writes no destination files.
4. `./bin/organize-album-source-files-web.sh "<confirmed-lufia-dir>" --execute`
   — exits 0 only after dry-run output is accepted.
5. `find etc/albums/3-organized-files -path '*Lufia*' -o -path '*lufia*'` —
   shows the expected new organized files or folders.
6. `git --no-pager diff --stat -- etc/albums/1-source-files` — output must be
   empty.
7. `git --no-pager diff --stat -- bin reports specs/2026-07-21/organize-lufia-ost-web-endpoints etc/albums/3-organized-files` —
   lists only expected script, artifact, checklist, and organized destination
   changes.
