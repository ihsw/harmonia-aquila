# Design: Organize Beastie Boys Albums via MCP

> Scope reminder: album work uses only the four MCP tools in requirements §3.
> Source is read-only; destination strategy remains `error`; no CLI, REST,
> GraphQL, direct root access, destructive recovery, new dependencies, or
> `npx`.

## 1. Overview

Use a per-flat-directory MCP pipeline: rediscover the entry, summarize all
tracks, validate the intended filenames, dry-run the combined metadata-and-copy
operation, review every row, and later execute the identical request. This
matches the organizer's flat-album boundary and keeps all repairs confined to
temporary destination copies (FR-1–FR-4, FR-10–FR-13).

Sixteen workflows need no explicit metadata repair. Anthology CD2 is a distinct
album tagged `[CD2]`, but its files carry disc number 2 and no disc total. A
single-directory validation therefore rejects non-contiguous disc 2. Its
complete inline manifest preserves every current semantic value and normalizes
only the isolated album's disc metadata to `1/1` (FR-6, FR-7).

Audit sidecars are known and preserved in place. Setting
`ignoreNonAudioFiles: true` is deliberate and applies only after list output
and the initial strict organizer errors identify the entries. Recognized
adjacent cover images remain included automatically; the anthology's parent
cover cannot cross the flat input boundary (FR-3–FR-5, FR-14).

## 2. Modified state

| State | Permitted change | Producer |
| --- | --- | --- |
| Configured source root | None | list, summary, validation, dry run |
| Configured destination root | 245 FLAC and 15 cover copies | later authorized organize execution |
| This spec | Checkbox and execution-note updates | implementing agent |

### Files and systems explicitly not modified

- `src/**`, `__tests__/**`, and `package.json`.
- MCP root configuration and all source content.
- Existing destination content; any collision stops the workflow.
- Anthology parent `cover.jpg` and discography-root `Jolly Roger.png`.

## 3. Candidate mapping and current evidence

| Workflow | Tracks | Art | Dry-run destination album | Status |
| --- | ---: | ---: | --- | --- |
| `1986 - Licensed To Ill/` | 13 | 1 | `Beastie Boys/Licensed To Ill` | planned |
| `1989 - Paul's Boutique/` | 15 | 1 | `Beastie Boys/Paul’s Boutique` | planned |
| `1992 - Check Your Head/` | 20 | 1 | `Beastie Boys/Check Your Head` | planned |
| `1992 - Frozen Metal Head/` | 5 | 1 | `Beastie Boys/Frozen Metal Head [EP]` | planned |
| `1994 - Ill Communication/` | 20 | 1 | `Beastie Boys/Ill Communication` | planned |
| `1994 - Some Old Bullshit/` | 14 | 1 | `Beastie Boys/Some Old Bullshit` | planned |
| `1994 - Sure Shot/` | 7 | 1 | `Beastie Boys/Sure Shot` | planned |
| `1995 - Aglio e olio/` | 9 | 1 | `Beastie Boys/Aglio E Olio` | planned |
| `1995 - Root Down/` | 10 | 1 | `Beastie Boys/Root Down` | planned |
| `1996 - The In Sound From Way Out!/` | 17 | 1 | `Beastie Boys/The In Sound From Way Out!` | planned |
| `1998 - Hello Nasty/` | 22 | 1 | `Beastie Boys/Hello Nasty` | planned |
| `1999 .../CD1/` | 21 | 0 | `Beastie Boys/Anthology- The Sounds Of Science [CD1]` | planned |
| `1999 .../CD2/` | 22 | 0 | `Beastie Boys/Anthology- The Sounds Of Science [CD2]` | planned with manifest |
| `2004 - To The 5 Boroughs/` | 15 | 1 | `Beastie Boys/To The 5 Boroughs` | planned |
| `2005 - Right Right Now Now/` | 7 | 1 | `The Beastie Boys/Right Right Now Now` | planned |
| `2007 - The Mix-Up/` | 12 | 1 | `Beastie Boys/The Mix‐Up` | planned |
| `2011 - Hot Sauce Committee Part Two/` | 16 | 1 | `Beastie Boys/Hot Sauce Committee Part Two` | planned |
| **Total** | **245** | **15** | 17 album directories | **260 rows** |

“Planned” means the 2026-08-03 MCP dry run returned only `would copy`; it does
not authorize execution or prove that destination state is still unchanged.

## 4. MCP request patterns

### 4.1 Discovery and audit

```json
// manage_albums_list
{}

// manage_albums_list: descend the returned discography entry
{ "prefix": "Beastie Boys Discography 1986-2011 [FLAC] vtwin88cube/" }

// summarize one flat workflow; dirName has no trailing slash
{ "dirName": "<returned flat workflow without final slash>",
  "ignoreNonAudioFiles": true }

// validate one flat workflow
{ "dirName": "<returned flat workflow without final slash>",
  "ignoreNonAudioFiles": true,
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title" }
```

The anthology parent must be listed again to discover `CD1/` and `CD2/`.
Neither summary nor validation may use `limit` (FR-1–FR-3, NFR-5).

### 4.2 Standard organize dry run

```json
{
  "albumDir": "<exact returned slash-terminated flat workflow>",
  "ignoreNonAudioFiles": true,
  "destinationStrategy": "error",
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title"
}
```

Use this input for every row in §3 except anthology CD2. Parse the JSON array
from `content[0].text` and reject `isError`, non-`would copy` actions, unexpected
tag changes, non-audio/non-art types, or duplicate destinations (FR-4, FR-5).

### 4.3 Anthology CD2 manifest and dry run

Build a 22-record in-memory array by joining unlimited summary and validation
rows on exact `filename`. For every record:

```json
{
  "filename": "<summary filename>",
  "album": "<summary album>",
  "artist": "<summary artist>",
  "title": "<summary title>",
  "trackNumber": "<numeric validation trackNumber>",
  "discNumber": 1,
  "discTotal": 1
}
```

Require a bijection: 22 unique summary filenames, 22 unique validation
filenames, 22 joined records, positive unique tracks 1–22, and no missing
field. Pass the array as `setMetadata` on the standard request. The reviewed
plan must expose old disc `2`/no total and effective `newDiscNumber: 1`,
`newDiscTotal: 1` for every row, with no changed album, artist, title, or track
value (FR-6, FR-7).

## 5. Review and execution gates

| Gate | Required evidence | Unlocks |
| --- | --- | --- |
| Inventory | exact 16 albums, 17 workflows, 245 tracks | full audit |
| Validation | 223 standard valid rows; only known CD2 disc issue | dry runs |
| Standard plans | 223 audio + 15 art `would copy` rows | standard review |
| CD2 plan | 22 repaired `would copy` rows | CD2 review |
| Global review | 260 unique destinations and accepted tag changes | execution requests |
| Execution | each input adds only `execute: true` | parity verification |

Execute one workflow at a time so a collision or partial failure is isolated.
Immediately before each execution, rerun and review its dry run. Compare every
returned field after normalizing only `action` from `would copy` to `copied`
(FR-10–FR-13, NFR-7, NFR-8).

## 6. Sidecar and artwork policy

- Known `.log`, `.m3u`, and `.txt` audit files remain in source and are ignored
  only for summary, validation, and organization parsing.
- Each recognized adjacent source cover must appear exactly once at its
  effective album root; no art may appear under a disc directory.
- Anthology `cover.jpg` is adjacent to the parent containing nested disc
  directories, not either flat audio input. Leave it in source and report it.
- Root `Jolly Roger.png` is not adjacent to an album input. Leave it in source
  and report it (FR-14).

## 7. Failure and recovery behavior

- Changed MCP inventory or metadata invalidates the recorded plan; rebuild the
  current plan instead of executing stale input.
- Any destination collision blocks only that workflow and all later writes
  until the user reviews the state. Do not use overwrite or ignore.
- An incomplete CD2 join blocks CD2; do not infer disc metadata or derive
  titles solely from filenames.
- A partial execution preserves evidence and stops. Destructive cleanup needs
  a separately approved recovery plan.
- Failure to copy non-adjacent anthology art is expected MCP-boundary evidence,
  not permission to use another interface.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Sidecars block flat input | High | Deliberately ignore only after list/strict-error evidence. |
| CD2 disc 2 is rejected alone | High | Complete inline manifest normalizes the distinct `[CD2]` album to `1/1`. |
| Nested anthology is treated recursively | High | List and process CD1/CD2 as separate flat workflows. |
| Destination changes after this spec | Medium | Rerun each dry run immediately before execution. |
| 2005 artist spelling is silently changed | Medium | Preserve `The Beastie Boys`; require separate approval to normalize. |
| Parent cover is silently lost | Medium | Preserve and explicitly report the MCP boundary case. |
| Partial batch write encourages overwrite | Medium | Execute sequentially and stop without destructive recovery. |

## 9. Verification

1. Confirm every album operation used one of the four scoped MCP tools.
2. Reconcile 16 top-level albums, 17 workflows, 245 unique FLAC filenames, and
   15 adjacent cover rows without `limit`.
3. Confirm 16 standard dry runs contain 223 audio plus 15 art rows and the CD2
   manifest dry run contains 22 audio rows.
4. Confirm all 260 destinations are unique and every execute row matches its
   accepted dry-run row after action normalization.
5. Confirm no source operation wrote data and both non-adjacent/root images
   remain explicitly reported.
6. If source code is unexpectedly modified, run
   `npm run lint -- <modified-file>` after every edit; only after all
   TypeScript edits run final `npm run lint`, `npm run build`, and `npm test`.

## 10. Completion condition

The operational goal is complete only after a separately authorized run
returns 245 audio and 15 cover `copied` rows with dry-run parity. This spec and
its current dry-run evidence alone do not authorize or constitute execution.
