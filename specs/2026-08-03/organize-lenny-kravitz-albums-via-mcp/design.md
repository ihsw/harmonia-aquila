# Design: Organize Lenny Kravitz Albums via MCP

> Scope reminder: album work uses only the four MCP tools in requirements §3.
> Source is read-only; destination strategy remains `error`; no alternate
> interface, destructive recovery, source restructuring, dependency change, or
> `npx` is permitted.

## 1. Overview

Apply the Beastie Boys per-flat-directory MCP pattern: rediscover source state,
summarize and validate complete inputs, dry-run combined metadata repair and
organization, review every row, and later execute an identical request. The
organizer changes only temporary destination copies and preserves source audio,
images, logs, and nested artwork (FR-1–FR-6, FR-11–FR-15).

Every album-artist tag contains `eNJoY-iT`, so all workflows explicitly set
album artist to `Lenny Kravitz` and use `albumartist` for the artist directory.
Track artist remains untouched, preserving featured performers. The advance
promo also sets one distinct album name to prevent 13 cross-workflow collisions
without overwriting, deleting, or discarding a possible distinct master
(FR-5–FR-8).

Four releases expose two separate flat directories whose tags already contain
distinct CD1/CD2 album names but no disc metadata. MCP cannot combine separate
source directories in one request, so each disc remains a separately named
destination album. Combining them requires a separately approved source-layout
or staging workflow and is outside this spec (FR-9).

## 2. Modified state

| State | Permitted change | Producer |
| --- | --- | --- |
| Configured source root | None | list, summary, validation, dry run |
| Configured destination root | 258 MP3 and 18 `Folder.png` copies | later authorized execution |
| This spec | Checkbox and execution-note updates | implementing agent |

### Files and systems explicitly not modified

- `src/**`, `__tests__/**`, `package.json`, dependencies, and MCP configuration.
- All source audio, images, logs, nested artwork, and directory structure.
- Existing destination entries; any collision stops work.

## 3. Candidate mapping and current evidence

| Workflow | Tracks | Art | Effective destination album |
| --- | ---: | ---: | --- |
| `1989 - Let Love Rule/` | 13 | 1 | `Let Love Rule` |
| `1993 - Are You Gonna Go My Way/` | 11 | 1 | `Are You Gonna Go My Way` |
| `1995 - Circus/` | 11 | 1 | `Circus` |
| `1999 - 5 (Reissue)/` | 15 | 1 | `5` |
| `2001 - Lenny (Advance Promo)/` | 12 | 1 | `Lenny (Advance Promo)` |
| `2001 - Lenny/` | 12 | 1 | `Lenny` |
| `2004 - Baptism/` | 13 | 1 | `Baptism` |
| `2008 - It Is Time ... Japan/` | 17 | 1 | `It Is Time For A Love Revolution (Deluxe)` |
| `2009 .../One - Let Love Rule + More/` | 19 | 1 | `Let Love Rule (20th Anniversary Deluxe Edition) CD1` |
| `2009 .../Two - Let Love Rule Live!/` | 12 | 1 | `Let Love Rule (20th Anniversary Edition) CD 2` |
| `2011 - Black And White America .../` | 18 | 1 | `Black And White America (Collectors Edition)` |
| `2012 ... Japan Tour Edition/CD1 - Album/` | 17 | 1 | `Black And White America (Japan Tour Edition) CD1` |
| `2012 ... Japan Tour Edition/CD2 - Bonus Disc/` | 6 | 1 | `Black And White America (Japan Tour Edition) CD2` |
| `2012 - Mama Said .../Disс One/` | 19 | 1 | `Mama Said (21St Anniversary Deluxe Edition) CD1` |
| `2012 - Mama Said .../Disс Two/` | 16 | 1 | `Mama Said (21St Anniversary Deluxe Edition) CD2` |
| `2013 - Are You Gonna .../Disc One/` | 18 | 1 | `Are You Gonna Go My Way (20th Anniversary Deluxe Edition) CD1` |
| `2013 - Are You Gonna .../Disc Two/` | 13 | 1 | `Are You Gonna Go My Way (20th Anniversary Deluxe Edition) CD2` |
| `2014 - Strut (Japan)/` | 16 | 1 | `Strut` |
| **Total** | **258** | **18** | **276 unique rows** |

The evidence is a dry run only. It does not authorize execution or prove future
destination availability.

## 4. MCP request patterns

### 4.1 Discovery and audit

```json
// manage_albums_list
{}

// descend collection and nested releases
{ "prefix": "Lenny Kravitz - Album Collection(1989-2014)[320Kbps]eNJoY-iT/" }

// summarize one flat workflow; dirName has no trailing slash
{ "dirName": "<returned flat workflow without final slash>",
  "ignoreNonAudioFiles": true }

// validate one flat workflow
{ "dirName": "<returned flat workflow without final slash>",
  "ignoreNonAudioFiles": true,
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title" }
```

List before ignoring anything. Summary and validation then deliberately ignore
known `foo_dr.log` files and nested artwork directories. Never use `limit`
(FR-1–FR-5, NFR-5).

### 4.2 Standard organize dry run

```json
{
  "albumDir": "<exact returned slash-terminated flat workflow>",
  "ignoreNonAudioFiles": true,
  "destinationStrategy": "error",
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title",
  "setAlbumArtist": "Lenny Kravitz"
}
```

Use this for 17 workflows. Parse the array from `content[0].text`; reject tool
errors, non-`would copy` actions, unexpected file types, track-artist changes,
or destinations outside `Lenny Kravitz/<Album>/` (FR-6, FR-8, FR-10).

### 4.3 Advance-promo dry run

Use the standard request plus:

```json
{ "setAlbum": "Lenny (Advance Promo)" }
```

Require 12 audio and one art row below
`Lenny Kravitz/Lenny (Advance Promo)/`. Compare its 12 titles, 320 kbps bitrate,
44.1 kHz sample rate, and durations with standard `Lenny`; preserve both because
the two one-second duration differences leave mastering identity ambiguous
(FR-7, FR-14).

## 5. Review and execution gates

| Gate | Required evidence | Unlocks |
| --- | --- | --- |
| Inventory | 14 candidates; 18 workflows; known sidecars/nesting | full audit |
| Metadata | 258 summarized and valid rows; album artist defect isolated | dry runs |
| Duplicate review | two `Lenny` sources compared; promo name accepted | global plan |
| Global dry run | 258 audio + 18 art rows; 276 unique destinations | execution review |
| Per-workflow rerun | current output equals accepted dry run | one execute call |
| Execution | `copied` rows equal dry-run rows except action | next workflow |

Execute sequentially. Immediately before each write, rerun the same dry-run
input and review it. Add only `execute: true`; compare all fields after
normalizing `copied` to `would copy` (FR-11–FR-14, NFR-7, NFR-8).

## 6. Sidecar and artwork policy

- Each `foo_dr.log` remains in source and is deliberately ignored only after
  listing identifies it.
- Each direct `Folder.png` must appear exactly once at the effective album root.
- Nested `Cover/` and `Artwork/` directories remain unchanged and unorganized.
- Collection `cd.jpg` and `Album.nfo` remain unchanged because they are not
  adjacent to a flat album workflow (FR-2, FR-15).

## 7. Duplicate and edition policy

- Keep both 2001 sources. The advance promo receives only the reviewed album
  name repair; track and quality metadata remain unchanged.
- Preserve collector, deluxe, anniversary, Japan, and tour editions as distinct
  album destinations exactly as shown in §3.
- Preserve each nested disc as a distinct album. Do not infer disc metadata or
  merge disc-local track sequences across separate MCP calls.
- Any new collision or uncertain edition difference stops execution rather
  than selecting, overwriting, or deleting a candidate.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Release-group tag creates wrong artist directory | High | Set album artist to `Lenny Kravitz` in every combined plan. |
| Two 2001 sources collide | High | Give the advance promo a reviewed distinct album name. |
| Nested discs are treated recursively | High | List and operate on each flat disc directory separately. |
| Featured track artists are flattened | Medium | Change album artist only; reject any track-artist change. |
| Destination changes after spec generation | Medium | Rerun every dry run immediately before execution. |
| Nested artwork is silently omitted | Medium | Preserve and explicitly report MCP boundary content. |
| Partial batch encourages overwrite | Medium | Execute sequentially and stop without destructive recovery. |

## 9. Verification

1. Confirm all album operations used only the four scoped MCP tools and omitted
   `limit`.
2. Reconcile 14 candidates, 18 flat workflows, 258 MP3s, and 18 direct covers.
3. Confirm every planned artist directory is `Lenny Kravitz`, featured track
   artists are preserved, and the advance promo has a distinct album path.
4. Confirm all 276 dry-run destinations are unique.
5. Confirm execution produces 276 matching `copied` rows and source summaries
   remain unchanged.
6. If source code is unexpectedly modified, run
   `npm run lint -- <modified-file>` after every edit; after all TypeScript
   edits run final `npm run lint`, `npm run build`, and `npm test`.

## 10. Completion condition

The operational goal is complete only after a separately authorized execution
returns 258 audio and 18 art `copied` rows with exact dry-run parity. This spec
and its current read-only evidence do not authorize execution.
