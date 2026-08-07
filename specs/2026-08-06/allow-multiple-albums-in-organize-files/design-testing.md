# Design: testing and verification

> Companion to [`design.md`](./design.md). Section numbers are continuous with it: this file holds
> §8 and §11.

## 8. Test updates

### 8.1 What stays the same

- Every existing assertion on `Multiple albums found:` and
  `Multiple artists resolve to the same album directory:` — CLI, REST, GraphQL, MCP, lib, and the
  six Bruno requests in `collections/harmonia-aquila-web/multiple-album-conflicts/`. None sets the
  flag, so none may change (NFR-8). If one needs editing, the default-off path has regressed.
- `__tests__/lib/albums/multiple-album-guard.test.ts` in full, including the
  `pathExists`-not-called and empty-`destDir` assertions (NFR-9). It owns the default-off contract.

### 8.2 What changes

```ts
// __tests__/lib/albums/allow-multiple-albums.test.ts (new)
it('organizes two albums whose track numbers both start at 1', async () => {
  await createTracks('a.flac', 'b.flac')
  mockTrack('Album A', 'Artist A', 1)
  mockTrack('Album B', 'Artist B', 1)

  const rows = await organizeAlbumFiles({ allowMultipleAlbums: true, destDir, sourceDir })

  expect(rows.map(row => row.destination)).toEqual([
    join('Artist A', 'Album A', '01 - Track 1.flac'),
    join('Artist B', 'Album B', '01 - Track 1.flac'),
  ])
})

it('organizes one album title held by two artists', async () => { … })         // FR-3
it('keeps both guards when the flag is absent', async () => { … })             // FR-3c, NFR-10
it('still rejects a repeated track number inside one destination album', … )   // FR-4b
it('excludes album art when more than one album resolves', async () => { … })  // FR-5
it('rejects the flag with sourceDirs before reading files', async () => { … }) // FR-6, NFR-9
```

The suite follows `multiple-album-guard.test.ts`: `music-metadata` and `pathExists` mocked, temp
directories from `__tests__/test-helpers.ts`, no real media (`docs/testing.md` hermetic rules). It
must also assert the **execute** path, not only dry-run rows — with `execute: true`, two album
trees exist under `destDir` and the art file does not.

### 8.3 Coverage parity table

| Suite | Disposition |
| --- | --- |
| `__tests__/lib/albums/multiple-album-guard.test.ts` | **unchanged** — owns the default-off contract |
| `__tests__/lib/albums/allow-multiple-albums.test.ts` | **new** — FR-2 – FR-6, NFR-9, both flag settings (NFR-10) |
| `__tests__/lib/albums/organize-files-album-art.test.ts` | extend — single-album art planning unchanged with the flag set (FR-5, second sentence) |
| `__tests__/lib/albums/organize-files-disc-policy.test.ts` | extend — per-destination `DTT` prefixing beside a single-disc album (FR-4c) |
| `__tests__/lib/albums/organize-files-set-metadata-input.test.ts` | extend — records assigning two albums with the flag (FR-13, `design.md` §7) |
| `__tests__/commands/manage-albums/organize-files.test.ts` | extend — `--allow-multiple-albums` parses and reaches the lib (FR-7) |
| `__tests__/commands/manage-albums/organize-files-errors.test.ts` | extend — `--allow-multiple-albums --source-dirs` fails via Commander (FR-6) |
| `__tests__/web/manage-albums-controller.test.ts` (195 lines) | extend only if it stays ≤ 200; otherwise a new sibling — REST forwards the boolean, non-boolean rejected (FR-8) |
| `__tests__/web/graphql/album.resolver.test.ts` | extend — resolver forwards the field (FR-9) |
| `__tests__/web/mcp.manage-albums-allow-multiple-albums.test.ts` | **new** — MCP forwards the field. ⚠ `mcp.manage-albums-operations.test.ts` is already 241 lines; do not grow it (NFR-5) |
| `collections/harmonia-aquila-web/multiple-album-allowed/` | **new** — 4 dry-run requests (FR-17) |

### 8.4 Bruno group shape (FR-17)

Four requests, modelled on `multiple-album-conflicts/` (structure) and `inline-set-metadata/`
(assertion style — assert planned rows and destinations, not just status codes):

| # | Surface | Body | Proves |
| --- | --- | --- | --- |
| 1 | REST | `allowMultipleAlbums` + inline `setMetadata`, two albums, both `trackNumber: 1` | FR-4a |
| 2 | GraphQL | same input via `albumOrganizeFiles` | FR-4a, FR-9 |
| 3 | MCP | same input via `manage_albums_organize_files` | FR-4a, FR-10 |
| 4 | REST | `allowMultipleAlbums` only, no `setMetadata` | FR-3 — the source's real tags are one album, two artists |

No request sets `execute`. The group uses only `baseUrl` and `mcpProtocolVersion` from
`environments/local.yml`; its album path variables are stale (`requirements.md` §7) and this spec
does not repair them.

## 11. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` (NFR-1)

Once at end of spec:

1. `npm run lint` — whole-codebase, exit 0
2. `npm run build` — exit 0 (NFR-2; the script is `build`, not `build:ts`)
3. `npm test` — exit 0 (NFR-3)
4. `npm run test:coverage` — 85% statements / 85% lines / 90% functions / 70% branches (NFR-10)
5. `git --no-pager diff --stat` over the NFR-7 path list — empty
6. `wc -l` on every modified file — ≤ 200 except `organize-files.ts`, recorded (NFR-5)
7. Bruno: `multiple-album-conflicts` still passes unchanged; the new `multiple-album-allowed` group
   passes against the `requirements.md` §7 fixture
