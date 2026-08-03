# MCP server

Harmonia Aquila exposes its album and audiobook operations through a scoped,
stateless Streamable HTTP MCP endpoint. The endpoint is part of `web serve`; the
repository does not provide a separate stdio MCP entrypoint.

## Start the server

Build the application and configure the three filesystem roots when starting
the web server:

```sh
npm run build
npm run web:serve -- \
  --source-dir /absolute/path/to/source \
  --scratch-dir /absolute/path/to/scratch \
  --dest-dir /absolute/path/to/destination \
  --host 127.0.0.1 \
  --port 3000
```

Each root must be an existing directory. The MCP endpoint is
`http://127.0.0.1:3000/mcp` and identifies itself as
`harmonia-aquila-web` version `1.0.0`.

The endpoint accepts `POST`. `GET /mcp` returns 405. Each POST creates and
closes its own MCP server and Streamable HTTP transport, so clients do not need
to manage an MCP session ID. Responses are JSON rather than an SSE stream.

Requests should send these headers:

```http
Accept: application/json, text/event-stream
Content-Type: application/json
MCP-Protocol-Version: 2025-11-25
```

The protocol version is negotiated by `initialize`; the value above is the
version exercised by the repository's integration and Bruno tests.

## Tool surface

Tools are registered and discovered in this order:

| MCP tool | Equivalent CLI command | Read only |
| --- | --- | --- |
| `manage_albums_list` | `manage-albums list` | yes |
| `manage_albums_summarize_source_dir` | `manage-albums summarize-source-dir` | yes |
| `manage_albums_validate` | `manage-albums validate` | yes |
| `manage_albums_organize_files` | `manage-albums organize-files` | no |
| `manage_audiobooks_validate` | `manage-audiobooks validate` | yes |
| `manage_audiobooks_crawl` | `manage-audiobooks crawl` | yes |
| `manage_audiobooks_copy_and_rename` | `manage-audiobooks copy-and-rename` | no |
| `manage_audiobooks_convert_file` | `manage-audiobooks convert-file` | no |
| `manage_audiobooks_merge` | `manage-audiobooks merge` | no |
| `manage_audiobooks_set_metadata` | `manage-audiobooks set-metadata` | no |

Discovery advertises `readOnlyHint: true` for read-only tools and
`readOnlyHint: false` for the others. Write-capable tools remain dry runs unless
`execute: true` is supplied; they do not currently advertise a
`destructiveHint` annotation.

## Configured roots and path confinement

Clients select paths inside the roots supplied to `web serve`; they cannot
replace those roots in tool input. Relative paths are resolved against the
applicable root. Absolute paths are accepted only when they remain inside that
root. Traversal and reachable symlink escapes are rejected before the domain
operation runs.

| Tool | Input root | Output root |
| --- | --- | --- |
| `manage_albums_list` | source; scratch when `useScratchDir: true` | none |
| `manage_albums_summarize_source_dir` | source | none |
| `manage_albums_validate` | source; scratch when `useScratchDir: true` | none |
| `manage_albums_organize_files` | source; scratch when `useScratchDir: true` | destination |
| `manage_audiobooks_validate` | source | none |
| `manage_audiobooks_crawl` | source | none |
| `manage_audiobooks_copy_and_rename` | source | destination |
| `manage_audiobooks_convert_file` | source | destination |
| `manage_audiobooks_merge` | the complete source root | destination |
| `manage_audiobooks_set_metadata` | source | destination |

`manage_albums_organize_files.setMetadata` is a non-empty inline array with one
record for every selected audio file. MCP never resolves it as a host path.

## Album tool contracts

`manage_albums_list` returns immediate entries as strings. Directory entries
end in `/`; pass one of those slash-terminated paths as `albumDir` to the tag
fix or organization tools. Use `./` when the album files are directly in the
selected root. A non-empty
`prefix` must be a slash-terminated path relative to the selected root.

| Tool | Required input | Optional input |
| --- | --- | --- |
| `manage_albums_list` | none | `prefix: string`, `useScratchDir: boolean` |
| `manage_albums_summarize_source_dir` | `dirName: string` | `ignoreNonAudioFiles: boolean`, `limit: non-negative integer` |
| `manage_albums_validate` | `dirName: string` | `artistFilenameStrategy: string`, `titleFilenameStrategy: string`, `ignoreNonAudioFiles: boolean`, `limit: non-negative integer`, `useScratchDir: boolean` |
| `manage_albums_organize_files` | `albumDir: string` ending in `/`, or `albumDirs: string[]` of at least two slash-terminated entries | `albumArtStrategy: string`; `setMetadata`: non-empty metadata-record array; strategy/set fields: strings; `execute`, `ignoreAudioFilesWithoutTracks`, `ignoreNonAudioFiles`, `resetTrack`, `swapArtistAlbumartist`, `useScratchDir`: booleans; `limit`: non-negative integer |

Strategy values are validated by the shared album operations. Defaults are
`artist`, `title`, `error`, and `no change`, as applicable. MCP uses native
numbers and booleans rather than CLI string encodings.

Album inspection and validation operate on one flat directory containing
`.flac` and `.mp3` files. Organization additionally accepts direct regular
`.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.tif`, `.tiff`, and `.webp`
files case-insensitively. It emits `audio` and `albumArt` `fileType` rows and
places art at the effective album root. Other sidecars, subdirectories, and
symlinks cause an error unless `ignoreNonAudioFiles: true` is supplied.

Concatenation is enabled with `discStrategy: "concatenate"` plus ordered
`albumDirs`. Each entry is resolved independently within the selected source or
scratch root. The operation rejects duplicate entries, fewer than two
directories, `setMetadata`, `limit`, `resetTrack`, and
`ignoreAudioFilesWithoutTracks`. Array order defines canonical disc position
and the array length defines disc total. For example, with
`albumDirs: ["disc-1/", "disc-2/"]`, local tracks `1,2` and `1` remain
`1,2,1` and receive disc metadata `1/2,1/2,2/2`. Correct values are preserved;
missing, partial, or conflicting values are repaired on destination copies.
MP3 output encodes `N/M` in ID3v2 `TPOS`, and FLAC output uses `DISCNUMBER` and
`DISCTOTAL`.

The combined output remains flat with no `Disc DD` directory despite retaining
multi-disc metadata. Exact duplicate flat audio destinations fail before any
write. If multiple source folders contain album art that would land on the same
destination path, `albumArtStrategy` becomes mandatory and chooses the `first`,
`last`, or `neither` candidate while unselected art is reported as
`would exclude` or `excluded`. These semantics supersede the initial global-
track/cleared-disc concatenate behavior.

Validation and organization accept only one normalized album directory per
call. Multiple albums produce tool-error content beginning
`Multiple albums found:`. One album associated with multiple normalized artist
directories is also an error. Validation returns no rows for either conflict;
organization checks both conflicts before destination inspection or writes.
Missing metadata and exact duplicate destinations appear as invalid validation
rows, while organization rejects them.

Disc metadata may be absent for selected albums with unique track numbers.
Repeated track numbers without effective disc numbers return tool-error content
that groups the duplicate tracks and recommends either the `setMetadata`
JSON/CSV path or explicit inference while retaining `missing disc number`.
Call `manage_albums_organize_files` with
`discStrategy: "infer"` only when filename order and track resets reliably
describe the discs; inference is never the default. Review all inferred disc
changes and `Disc DD` destinations before a separate `execute: true` call.
Partial disc metadata and disc totals without disc numbers remain invalid.

## Audiobook tool contracts

| Tool | Required input | Optional input |
| --- | --- | --- |
| `manage_audiobooks_validate` | `fileName: string` | none |
| `manage_audiobooks_crawl` | `dirName: string` | none |
| `manage_audiobooks_copy_and_rename` | `fileName: string` | `execute: boolean` |
| `manage_audiobooks_convert_file` | `fileName: non-empty string[]` | `author`, `narrator`, `title`: strings; `jobs`, `concurrency`: positive integers; `execute: boolean` |
| `manage_audiobooks_merge` | none | `bypassMetadata`, `execute`: booleans; `jobs: positive integer` |
| `manage_audiobooks_set_metadata` | `author`, `destFilepath`, `sourceFilepath`, `title`: non-empty strings | `narrator: string`, `execute: boolean` |

Conversion defaults to `jobs: 16` and `concurrency: 4`; merge defaults to
`jobs: 16`. Audiobook validation, copy/rename, crawl, and metadata setting
retain their M4B and metadata requirements. Executed conversion and merge
operations retain the existing Docker and `m4b-tool` behavior.

## Results and errors

Successful `tools/call` results contain one text content item. Its text is a
JSON-encoded array matching the equivalent CLI command's `--format json`
rows:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"action\":\"would copy\",\"destination\":\"Artist/Album/cover.jpg\",\"fileType\":\"albumArt\",\"filename\":\"cover.jpg\"}]"
    }
  ]
}
```

The server does not currently return MCP `structuredContent`; clients must
parse `content[0].text` as JSON. Schema failures, path-confinement failures, and
domain validation failures are returned through the MCP tool-error path and
must not be treated as successful empty results.

## Example request

After initialization, a client can list tools with a regular JSON-RPC request:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

A safe album workflow is to call `manage_albums_list`, summarize and validate
the selected album, then dry-run `manage_albums_organize_files` with any needed
metadata repair options. Review every `fileType`, `tagChanges`, and destination
field, including adjacent art at the album root and any concatenated
`sourceDirectory` markers, before
repeating the identical input with `execute: true`. Organization repairs a
temporary copy before publishing to the configured destination root and never
changes source audio or images. Collision preflight and the selected destination
strategy apply to the combined audio-and-art plan.

## Exposure and logging

The default host is `127.0.0.1`. Browser requests with an `Origin` header are
accepted only for `localhost`, `127.0.0.1`, or IPv6 loopback origins; an absent
`Origin` header is allowed. The endpoint has no authentication layer, so do not
bind it to an untrusted network without adding an external access-control
boundary.

`web serve` writes newline-delimited Pino JSON records to stderr. Records
include readiness, completed requests, and unexpected failures. Each response
returns an `x-request-id` for correlation. Request bodies, query strings,
authorization and cookie headers, and client filesystem paths are not logged.

## Verification

The protocol tests cover initialization, deterministic discovery, annotations,
native schemas, root resolution, traversal rejection, domain option mapping,
tool errors, and dry-run safety. The Bruno collection under
`collections/harmonia-aquila-web/mcp/` exercises the built HTTP endpoint.
