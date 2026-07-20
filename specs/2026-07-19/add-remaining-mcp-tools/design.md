# Design: Add Remaining MCP Tools

> Scope reminder: this spec touches **only** MCP schemas/tools under
> `src/web/**`, web MCP tests under `__tests__/web/**`, Bruno MCP requests under
> `collections/harmonia-aquila-web/mcp/**`, and `docs/mcp-server.md` if its
> current tool-surface text becomes stale. No REST, CLI, package metadata, or
> stdio MCP server changes; no `npx`.

## 1. Overview

Build on the registry introduced by `refactor-mcp-tool-registration`. Each new tool should be an adapter over the same shared domain function used by the REST controller, with Zod input schemas under `src/web/schemas/mcp/**` and tool factories under `src/web/servers/mcp-tools/**`. The root MCP registry continues to compose manage-albums first, then manage-audiobooks, and `mcp-server.ts` continues to register via the existing `Array.reduce()` flow (FR-1, FR-2).

MCP input is structured JSON, so booleans should be booleans and numeric concurrency/job/limit fields MAY be numbers in the MCP schema. Handlers must convert to the string fields expected by domain functions where REST currently passes strings (FR-3, FR-4). Path validation remains in `WebPathResolver`; schemas validate shape, while resolver enforces source/destination root boundaries (FR-5).

## 2. File layout

### Modified and new files

```text
src/web/schemas/mcp/manage-albums.ts
src/web/schemas/mcp/manage-audiobooks.ts
src/web/schemas/mcp/index.ts
src/web/servers/mcp-tools/helpers.ts                      (optional: JSON content / exact optional helpers)
src/web/servers/mcp-tools/manage-albums/fix-tags.ts
src/web/servers/mcp-tools/manage-albums/organize-files.ts
src/web/servers/mcp-tools/manage-albums/index.ts
src/web/servers/mcp-tools/manage-audiobooks/validate.ts
src/web/servers/mcp-tools/manage-audiobooks/crawl.ts
src/web/servers/mcp-tools/manage-audiobooks/copy-and-rename.ts
src/web/servers/mcp-tools/manage-audiobooks/convert-file.ts
src/web/servers/mcp-tools/manage-audiobooks/merge.ts
src/web/servers/mcp-tools/manage-audiobooks/set-metadata.ts
src/web/servers/mcp-tools/manage-audiobooks/index.ts
__tests__/web/mcp.controller.test.ts
collections/harmonia-aquila-web/mcp/*.yml
docs/mcp-server.md                                      (only if current surface text needs update)
```

### Files explicitly NOT modified

- `src/web/controllers/**` remains the REST adapter layer.
- `src/web/schemas/request-schemas.ts` remains REST request validation.
- `src/web/servers/mcp-server.ts` should not need behavioral edits beyond imports if the registry shape already works.
- `src/lib/**` remains unchanged.
- `package.json` and `package-lock.json` remain unchanged (NFR-7).

## 3. Tool map

| MCP tool | Domain function | Path/root mapping | Notes |
| -------- | --------------- | ----------------- | ----- |
| `manage_albums_summarize_source_dir` | `summarizeAlbumSourceDir` | `dirName` via `resolveSource` | Existing tool; keep unchanged. |
| `manage_albums_fix_tags` | `fixAlbumTags` | Uses configured `sourceDir` and `destDir` | No `sourceDir`/`destDir` inputs. |
| `manage_albums_organize_files` | `organizeAlbumFiles` | Uses configured `sourceDir` and `destDir` | No `sourceDir`/`destDir` inputs. |
| `manage_audiobooks_validate` | `validateAudiobook` | `fileName` via `resolveSource` | Read-only. |
| `manage_audiobooks_crawl` | `crawlAudiobooks` | `dirName` via `resolveSource` | Read-only. |
| `manage_audiobooks_copy_and_rename` | `copyAndRenameAudiobook` | `fileName` via `resolveSource`; configured `destDir` | Exposes `execute?: boolean`. |
| `manage_audiobooks_convert_file` | `convertAudiobookFiles` | each `fileName` via `resolveSource`; configured `destDir` | Default `jobs` and `concurrency` match REST. |
| `manage_audiobooks_merge` | `mergeAudiobooks` | configured `sourceDir` and `destDir` | Exposes `jobs`, `bypassMetadata`, `execute`. |
| `manage_audiobooks_set_metadata` | `setAudiobookMetadata` | `sourceFilepath` via `resolveSource`; `destFilepath` via `resolveDest` | Exposes metadata fields and `execute`. |

## 4. Schema design

### 4.1 Album schemas

Add constants for:

```ts
MANAGE_ALBUMS_FIX_TAGS_TOOL_NAME = 'manage_albums_fix_tags'
MANAGE_ALBUMS_ORGANIZE_FILES_TOOL_NAME = 'manage_albums_organize_files'
```

Schemas mirror REST body fields, excluding root override fields:

| Tool | Input fields |
| ---- | ------------ |
| `fix_tags` | `albumArtistsStrategy?`, `albumStrategy?`, `destinationStrategy?`, `execute?`, `limit?`, `producerStrategy?`, `resetTrack?`, `setAlbum?`, `setAlbumArtist?`, `setArtist?`, `setMetadata?`, `swapArtistAlbumartist?` |
| `organize_files` | `artistFilenameStrategy?`, `execute?`, `ignoreAudioFilesWithoutTracks?`, `ignoreNonAudioFiles?`, `limit?`, `titleFilenameStrategy?` |

`limit` MAY be `z.number().int().nonnegative().optional()` for MCP ergonomics, but handlers must pass `String(limit)` where domain options expect strings.

### 4.2 Audiobook schemas

Add constants for all six audiobook tool names from the tool map. Input fields:

| Tool | Input fields |
| ---- | ------------ |
| `validate` | `fileName: string` |
| `crawl` | `dirName: string` |
| `copy_and_rename` | `fileName: string`, `execute?: boolean` |
| `convert_file` | `fileName: string[]`, `concurrency?: number`, `jobs?: number`, `author?: string`, `narrator?: string`, `title?: string`, `execute?: boolean` |
| `merge` | `jobs?: number`, `bypassMetadata?: boolean`, `execute?: boolean` |
| `set_metadata` | `author: string`, `destFilepath: string`, `sourceFilepath: string`, `title: string`, `narrator?: string`, `execute?: boolean` |

For `convert_file`, MCP should require at least one `fileName` item. This is a permitted contract improvement over REST's empty-list delegation because MCP schemas are the contract boundary; tests must assert the chosen error shape (FR-8).

## 5. Handler pattern

All tools should use one response helper if added:

```ts
export function jsonToolContent(value: unknown) {
  return { content: [{ text: JSON.stringify(value), type: 'text' as const }] }
}
```

Handlers should follow the existing summarize tool style:

```ts
export function createManageAudiobooksValidateTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration<typeof manageAudiobooksValidateInputSchema> {
  return {
    handler: async input => jsonToolContent(await validateAudiobook({
      fileName: await context.pathResolver.resolveSource(input.fileName, 'fileName'),
    })),
    name: MANAGE_AUDIOBOOKS_VALIDATE_TOOL_NAME,
    options: {
      annotations: { readOnlyHint: true },
      description: 'Validate audiobook metadata for a source-root-relative file.',
      inputSchema: manageAudiobooksValidateInputSchema,
      title: 'Manage audiobooks validate',
    },
  }
}
```

Use `optionalEntry` or an MCP-local equivalent to avoid passing explicit `undefined` into domain option objects under `exactOptionalPropertyTypes`.

## 6. Tool group registration

`manage-albums/index.ts` should return:

1. `createManageAlbumsSummarizeSourceDirTool(context)`
2. `createManageAlbumsFixTagsTool(context)`
3. `createManageAlbumsOrganizeFilesTool(context)`

`manage-audiobooks/index.ts` should return:

1. `createManageAudiobooksValidateTool(context)`
2. `createManageAudiobooksCrawlTool(context)`
3. `createManageAudiobooksCopyAndRenameTool(context)`
4. `createManageAudiobooksConvertFileTool(context)`
5. `createManageAudiobooksMergeTool(context)`
6. `createManageAudiobooksSetMetadataTool(context)`

This order is the expected `tools/list` order unless the SDK sorts internally. Tests and Bruno should assert exact names and count; if the SDK order differs, assert a sorted name list and document why.

## 7. Test updates

### 7.1 Unit/web tests

Extend `__tests__/web/mcp.controller.test.ts` or split it if it exceeds 200 lines. Required coverage:

| Area | Required assertion |
| ---- | ------------------ |
| Tool list | exactly nine expected tool names. |
| Album tools | `fix_tags` and `organize_files` call the expected domain mocks with configured roots and option mapping. |
| Audiobook read tools | `validate` and `crawl` resolve source paths and call domain mocks. |
| Audiobook write-capable tools | `copy_and_rename`, `convert_file`, `merge`, and `set_metadata` preserve `execute` and root mapping. |
| Failure semantics | at least one schema validation failure and one source/destination traversal failure do not call the domain mock. |

Mock domain functions at the boundary as current tests do for `summarizeAlbumSourceDir`.

### 7.2 Bruno collection

Add MCP requests for:

```text
collections/harmonia-aquila-web/mcp/
  call-manage-albums-fix-tags.yml
  call-manage-albums-organize-files.yml
  call-manage-audiobooks-validate-path-traversal.yml
  call-manage-audiobooks-crawl.yml
  call-manage-audiobooks-copy-and-rename-path-traversal.yml
  call-manage-audiobooks-convert-file-empty-list.yml
  call-manage-audiobooks-merge-source-dir-override.yml
  call-manage-audiobooks-set-metadata-dest-path-traversal.yml
```

Also update `tools-list.yml` to assert the nine-tool surface. Prefer a few representative happy paths and contract failures rather than duplicating every REST collection request.

## 8. Migration strategy

1. Add MCP schemas and tool name constants for manage-albums, then implement album tool files and update the album group.
2. Add MCP schemas and tool name constants for manage-audiobooks, then implement audiobook tool files and update the audiobook group.
3. Add shared MCP response/option helpers if repeated code appears in more than two files.
4. Update unit tests for tool listing and handler option mapping.
5. Update Bruno MCP requests and `tools-list.yml`.
6. Run focused web/MCP tests, build, live Bruno, and final full verification.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| MCP schema types diverge from REST/domain option types | Medium | Use controller mappings as source of truth and test domain mock calls per tool. |
| `tools/list` becomes too broad or ordered unexpectedly | Medium | Assert exact tool name set/count in unit tests and Bruno. |
| Write-capable tools accidentally execute by default | Medium | Preserve `execute` optional behavior and test dry-run/default calls. |
| Empty `convert_file.fileName` behavior differs from REST | Medium | Document the MCP contract and add explicit test/Bruno coverage. |
| Test file exceeds 200 lines | Medium | Split MCP tests by group, e.g. `mcp.manage-albums.test.ts` and `mcp.manage-audiobooks.test.ts`. |
| Repeated JSON content mapping drifts | Low | Extract a local helper once repeated in multiple tool files. |

## 10. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web`
2. `npm run build`

Live MCP/Bruno checks:

1. `npm run build`
2. `npm run web:serve -- --source-dir etc/albums --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000`
3. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail`
4. Stop the captured server PID with `kill <PID>`.

Final checks:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md` — must list only expected MCP tool, test, collection, and doc files.
