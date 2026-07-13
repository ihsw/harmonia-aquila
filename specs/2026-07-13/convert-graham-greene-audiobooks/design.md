# Design: Convert Graham Greene Audiobooks

> Scope reminder: this workflow touches only the 19 Graham Greene MP3 sources
> and new M4Bs in `etc/audiobooks/3-renamed-files/`. No source-code edits, no
> overwrite behavior, and no `npx`.

## 1. Overview

The workflow runs one built CLI `convert-file` command with all 19 source
arguments in dry-run mode, then reruns that exact batch with `--execute` only
when every reported destination matches this manifest. `p-limit` constrains
the execution phase to four simultaneous conversions. The command uses each
source's embedded `artist` and `album` values to set the M4B performer and
title (FR-1–FR-3).

Each execution is followed by `validate`, which proves the created filename
matches its embedded performer and title (FR-4). The CLI mounts the source
directory read-only in Docker and rejects an existing destination, satisfying
FR-6 and NFR-3.

## 2. Inputs and outputs

| Source MP3 | Expected destination M4B |
| --- | --- |
| `Graham Greene - A Burnt-out Case.mp3` | `Graham Greene - A Burnt-out Case.m4b` |
| `Graham Greene - Brighton Rock.mp3` | `Graham Greene - Brighton Rock.m4b` |
| `Graham Greene - Monsignor Quixote.mp3` | `Graham Greene - Monsignor Quixote.m4b` |
| `Graham Greene - Our Man in Havana.mp3` | `Graham Greene - Our Man in Havana.m4b` |
| `Graham Greene - Stamboul Train.mp3` | `Graham Greene - Stamboul Train: An Entertainment.m4b` |
| `Graham Greene - The Captain and the Enemy.mp3` | `Graham Greene - The Captain and the Enemy.m4b` |
| `Graham Greene - The Comedians.mp3` | `Graham Greene - The Comedians.m4b` |
| `Graham Greene - The Complete Short Stories of Graham Greene.mp3` | `Graham Greene - The Complete Short Stories of Graham Greene.m4b` |
| `Graham Greene - The Confidential Agent .mp3` | `Graham Greene - The Confidential Agent.m4b` |
| `Graham Greene - The End of the Affair.mp3` | `Graham Greene - The End of the Affair.m4b` |
| `Graham Greene - The Heart of the Matter.mp3` | `Graham Greene - The Heart of the Matter.m4b` |
| `Graham Greene - The Honorary Consul.mp3` | `Graham Greene - The Honorary Consul.m4b` |
| `Graham Greene - The Human Factor.mp3` | `Graham Greene - The Human Factor.m4b` |
| `Graham Greene - The Man Within.mp3` | `Graham Greene - The Man Within.m4b` |
| `Graham Greene - The Power and the Glory.mp3` | `Graham Greene - The Power and the Glory.m4b` |
| `Graham Greene - The Quiet American.mp3` | `Graham Greene - The Quiet American.m4b` |
| `Graham Greene - The Third Man.mp3` | `Graham Greene - The Third Man.m4b` |
| `Graham Greene - This Gun for Hire.mp3` | `Graham Greene - This Gun for Hire.m4b` |
| `Graham Greene - Travels with My Aunt.mp3` | `Graham Greene - Travels with My Aunt.m4b` |

The source directory is
`etc/audiobooks/1-source-files/renaming/Graham Greene/`; every destination is
under `etc/audiobooks/3-renamed-files/`.

## 3. Command pattern

Run the complete dry-run batch:

```sh
node build/dist/index.js manage-audiobooks convert-file \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - A Burnt-out Case.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - Brighton Rock.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - Monsignor Quixote.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - Our Man in Havana.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - Stamboul Train.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Captain and the Enemy.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Comedians.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Complete Short Stories of Graham Greene.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Confidential Agent .mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The End of the Affair.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Heart of the Matter.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Honorary Consul.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Human Factor.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Man Within.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Power and the Glory.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Quiet American.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - The Third Man.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - This Gun for Hire.mp3" \
  --file-name "etc/audiobooks/1-source-files/renaming/Graham Greene/Graham Greene - Travels with My Aunt.mp3" \
  --dest-dir etc/audiobooks/3-renamed-files \
  --jobs 4 \
  --concurrency 4 \
  --format json
```

Compare all 19 JSON rows to the manifest. Then rerun the exact batch with
`--execute`. After a successful batch, validate each expected destination:

```sh
node build/dist/index.js manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/<expected destination>" \
  --format json
```

The output filename is not supplied independently: `convert-file` derives it
from metadata. This prevents the source filename typo in
`Graham Greene - The Confidential Agent .mp3` from propagating to the output.

## 4. Failure handling

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Source metadata differs from the manifest | Low | Stop at dry run; do not execute the batch. |
| Destination already exists | Low | Preserve it; do not use overwrite flags. |
| Docker or `m4b-tool` fails | Medium | `p-limit` waits for active work; preserve source and any generated destination for review, then stop. |
| Output metadata does not validate | Low | Preserve both files and quarantine the output for review. |
| Resource contention | Low | `--concurrency 4` limits simultaneous conversions to four. |

## 5. Verification

1. Run `npm run build` before invoking the built CLI.
2. Run the 19-file dry-run and execution commands with `--concurrency 4`, then
   validate every manifest destination.
3. Confirm every validation JSON result includes `"valid": true`.
4. Confirm the 19 source MP3 paths still exist and that all 19 expected M4B
   destinations exist.
