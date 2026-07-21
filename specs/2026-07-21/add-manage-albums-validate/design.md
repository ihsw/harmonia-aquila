# Design: Add Manage Albums Validate

> Scope reminder: this spec touches only album domain/CLI/web/MCP surfaces,
> related tests, Bruno requests, and directly related docs listed in
> `requirements.md` §3. No package dependency changes, no stdio MCP server, no
> data-processing workflows, and no `npx`.

## 1. Overview

Use a thin-adapter design. Add a shared read-only album validation service under
`src/lib/albums/validate.ts`; CLI, REST, and MCP adapters parse their native
inputs and delegate to that service (FR-1, FR-7, FR-8). The service reuses or
extracts existing album helper logic for file discovery, limit parsing,
strategy parsing, path segment sanitization, track formatting, and duplicate
planned destination detection (FR-2 through FR-4).

Validation differs from `organize-files` in failure semantics. Invalid request
shape, invalid strategies, invalid limits, path errors, and metadata parse
errors still throw project errors (FR-9). Missing metadata and duplicate
relative organization destinations are returned as validation row `issues`
rather than aborting at the first bad file, so callers can audit an album
folder in one read-only pass (FR-5, FR-6).

The output is intentionally close to `organize-files` dry-run rows but includes
`status` and `issues`. The service computes a destination relative path from
metadata and existing sanitization rules without touching the destination
filesystem. This lets validation answer "would this organize cleanly?" without
requiring `--dest-dir` (FR-4, FR-6).

## 2. File layout

### Modified and new files

```text
src/lib/albums/validate.ts
src/lib/albums/organize-files.ts                    (optional helper extraction only)
src/commands/manage-albums/validate.ts
src/commands/manage-albums/index.ts
src/web/controllers/manage-albums.controller.ts
src/web/schemas/request-schemas.ts
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/validate.ts
src/web/servers/mcp-tools/manage-albums/index.ts
__tests__/lib/albums/validate.test.ts
__tests__/commands/manage-albums/validate.test.ts
__tests__/commands/index-registration.test.ts
__tests__/web/controllers.test.ts
__tests__/web/mcp.manage-albums.test.ts
collections/harmonia-aquila-web/manage-albums/validate.yml
collections/harmonia-aquila-web/manage-albums/validate-path-traversal.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate-path-traversal.yml
collections/harmonia-aquila-web/mcp/tools-list.yml
docs/mcp-server.md
docs/testing.md                                      (only if Bruno smoke docs mention exact tool count)
```

### Files explicitly NOT modified

- `package.json` and `package-lock.json`: no new dependencies (NFR-7).
- `src/web/controllers/manage-audiobooks.controller.ts`: audiobook validation
  is unrelated.
- `src/web/servers/mcp-tools/manage-audiobooks/**`: audiobook MCP tools remain
  unchanged.
- `src/lib/albums/fix-tags.ts`: validation does not change tag-writing
  behavior.

## 3. Domain service design

Add `validateAlbumSourceDir(options: ValidateAlbumSourceDirOptions):
Promise<ValidateAlbumSourceDirJsonOutput>`.

```ts
export interface ValidateAlbumSourceDirOptions {
  artistFilenameStrategy?: string
  dirName: string
  ignoreNonAudioFiles?: boolean
  limit?: string
  titleFilenameStrategy?: string
}

export interface ValidateAlbumSourceDirJsonOutputRow {
  album: string
  artistFilename: string
  artistFilenameStrategy: ArtistFilenameStrategy
  destination: string
  filename: string
  issues: string[]
  status: 'invalid' | 'valid'
  titleFilename: string
  titleFilenameStrategy: TitleFilenameStrategy
  trackNumber: string
}
```

Implementation notes:

| Concern | Design |
| ------- | ------ |
| File discovery | Call `getAudioFiles(dirName, { ignoreNonAudioFiles })` and apply `parseLimit`, matching existing album services (FR-2). |
| Metadata parsing | Use `music-metadata.parseFile` with `p-limit(16)`, matching existing album concurrency. |
| Strategy parsing | Extract `parseArtistFilenameStrategy`, `parseTitleFilenameStrategy`, `getArtistFilename`, `sanitizePathSegment`, and `formatTrackNumber` from `organize-files.ts` if needed; keep behavior identical (FR-3, FR-4). |
| Missing fields | Add stable issue strings such as `missing album`, `missing artist`, `missing track number`, and `missing title`; do not throw for these row-level failures (FR-5). |
| Destination | Build `<artist>/<album>/<track> - <title><ext>` as a relative path only; do not resolve against or stat a real destination root (FR-4, FR-6). |
| Duplicate destinations | After all rows are built, add `duplicate destination: <path>` to every row sharing the same non-empty destination path (FR-4). |

If the helper extraction would make `organize-files.ts` less clear, introduce
`src/lib/albums/organization-plan.ts` for strategy/path helpers and import it
from both `organize-files.ts` and `validate.ts`.

## 4. Adapter mapping

| Surface | Endpoint/command/tool | Input mapping | Output |
| ------- | --------------------- | ------------- | ------ |
| CLI | `manage-albums validate` | `--dir-name`, strategies, `--ignore-non-audio-files`, `--limit`, `--format` | `writeRows(parseOutputFormat(...), rows)` |
| REST | `GET /manage-albums/validate` | Query schema; `dirName` via `WebPathResolver.resolveSource` | JSON row array |
| MCP | `manage_albums_validate` | Zod MCP schema with `limit?: number`; `dirName` via `resolveSource`; `optionalNumberEntry` converts limit | `jsonToolContent(rows)` |

REST query schema should mirror `summarizeSourceDirQuerySchema` plus the two
strategy options. MCP schema should mirror the REST shape but use native
booleans and `limit?: number`.

## 5. Registration order

Update album command/tool ordering consistently:

```text
manage-albums summarize-source-dir
manage-albums validate
manage-albums fix-tags
manage-albums organize-files
```

For MCP, `getManageAlbumsMcpTools()` should return:

1. `createManageAlbumsSummarizeSourceDirTool(context)`
2. `createManageAlbumsValidateTool(context)`
3. `createManageAlbumsFixTagsTool(context)`
4. `createManageAlbumsOrganizeFilesTool(context)`

`collections/harmonia-aquila-web/mcp/tools-list.yml` and web MCP tests must
assert this deterministic order before audiobook tools (FR-10).

## 6. Test updates

### 6.1 Domain and CLI tests

| Test area | Required assertions |
| --------- | ------------------- |
| Valid album rows | Complete metadata returns `status: "valid"`, empty `issues`, formatted track, and relative destination. |
| Missing metadata | Missing album/artist/title/track returns `status: "invalid"` and stable issue strings without throwing. |
| Duplicate destination | Two files resolving to the same destination both receive duplicate-destination issues. |
| Invalid folder/options | Non-audio entries, bad limit, and unsupported strategies throw `UserInputError`. |
| CLI output | `--format json` emits the validation row array; plaintext output remains compatible with `writeRows`. |

### 6.2 Web and MCP tests

| Test area | Required assertions |
| --------- | ------------------- |
| REST success | `GET /manage-albums/validate` resolves `dirName` under configured source root and returns rows. |
| REST failures | Path traversal and invalid boolean/limit/strategy return existing HTTP error shape. |
| MCP tool list | `manage_albums_validate` appears between summarize and fix-tags. |
| MCP call success | Tool handler maps native inputs, converts `limit` to string, and returns parseable JSON text. |
| MCP failures | Invalid schema input and traversal do not call the domain function. |

### 6.3 Bruno requests

Add one REST happy path and one REST path traversal request. Add one MCP happy
path and one MCP traversal request. Update `tools-list.yml` to expect ten total
tools: four manage-albums tools and six manage-audiobooks tools.

## 7. Migration strategy

1. Add/extract shared album organization helper logic while preserving
   `organize-files` behavior.
2. Add the new domain validation service and its tests.
3. Add CLI command registration and command tests.
4. Add REST schema/controller route and web controller tests.
5. Add MCP schema/tool registration and MCP tests.
6. Add Bruno REST/MCP requests and update docs.
7. Run focused checks, then final lint/build/test verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Validation helper extraction changes `organize-files` behavior | Medium | Keep extraction mechanical and run existing organize-files tests plus new validation tests. |
| Row-level invalid metadata semantics surprise CLI users | Medium | Document that request/path/parse failures throw, while missing organization metadata is reported in `issues`. |
| Destination duplicate detection misses rows with missing fields | Medium | Only duplicate-check rows with computable destinations and keep missing-field issues explicit. |
| MCP schema diverges from REST/CLI option names | Low | Use existing manage-albums schema naming and add option-mapping tests. |
| Tool-list ordering changes Bruno expectations | Low | Assert deterministic order in unit tests and Bruno. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/validate.test.ts`
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/validate.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts __tests__/web/controllers.test.ts`
4. `npm run build`

Live REST/MCP/Bruno checks:

1. `npm run build`
2. `npm run web:serve -- --source-dir etc/albums/1-source-files --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000`
3. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run manage-albums/validate.yml mcp/call-manage-albums-validate.yml --env local --bail`
4. Stop the captured server PID with `kill <PID>`.

Final checks:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript
   modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `git --no-pager diff --stat -- src __tests__ collections docs` — must list
   only files expected by this spec plus any user-approved scope expansion.
