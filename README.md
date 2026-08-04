# Harmonia Aquila

Harmonia Aquila is an MCP server for safely inspecting, validating, and organizing local music albums and M4B audiobooks. Connect an MCP-capable client, describe the outcome you want, and review the dry-run rows before authorizing any copy or metadata work.

The server never changes source audio or artwork while organizing. Its write-capable tools are dry runs unless the caller explicitly supplies `execute: true`.

## What it can do

- List, summarize, validate, and organize FLAC and MP3 albums, including adjacent cover art.
- Detect metadata, destination-path, disc-numbering, and duplicate-track issues.
- Combine ordered disc folders while retaining each disc's local track numbers and writing canonical disc metadata.
- Repair metadata on destination copies with album-, artist-, disc-, and track-level overrides.
- Validate, crawl, rename, convert, merge, and tag M4B audiobooks.

## Run and connect the MCP server

Install dependencies, build, and start the web server with the source and destination roots that the MCP client may access:

```sh
npm install
npm run build
npm run web:serve -- \
  --source-dir /music/source \
  --dest-dir /music/organized \
  --host 127.0.0.1 \
  --port 3000
```

Connect your MCP client to `http://127.0.0.1:3000/mcp`. The endpoint uses stateless Streamable HTTP and accepts `POST` requests. The configured roots are the server boundary: tool inputs use paths relative to them and cannot access files outside them.

The default host is loopback-only. The server has no authentication layer, so keep it on a trusted network or add an access-control boundary.

## Use it with prompts

These examples are requests to make through an MCP-capable assistant or client. They describe the workflow the assistant should carry out with Harmonia Aquila's tools; they are not shell commands.

### Organize an album safely

Start by discovering and inspecting the available source folders:

> List the album folders available for organizing. Then summarize `Artist/Album/`, including its tracks, tags, and any cover art.

Validate the selection before planning changes:

> Validate `Artist/Album/`. Use `albumartist` for artist filenames and `title` for track filenames. Report invalid metadata, duplicate destinations, and tracks that need repair.

Ask for a dry-run plan and require a reviewable result:

> Dry-run organize `Artist/Album/` with the validated filename rules. Do not execute. List every planned audio and album-art row, its destination, and any tag changes.

Only after reviewing that plan, explicitly approve the identical operation:

> Execute the previously reviewed organization plan for `Artist/Album/` exactly as shown. Report copied files, excluded files, and any failures.

The assistant should use `manage_albums_list`, `manage_albums_summarize_source_dir`, `manage_albums_validate`, and `manage_albums_organize_files` in that order. `execute: true` belongs only in the final, approved request.

### Combine a multi-disc release

Concatenation combines ordered, flat disc folders into one album directory. The folder order becomes disc order; local track positions remain local, and destination copies receive the disc number and total.

> Dry-run organize `Artist/Album/disc-1/` and `Artist/Album/disc-2/` as one release, using the concatenate disc strategy in that order. Keep local track numbers, use the first disc's album art, and list all proposed destinations and tag changes. Do not execute.

If multiple disc folders have artwork that would write to the same destination, choose `first`, `last`, or `neither` for the album-art strategy. Review the flat output paths and every track's disc metadata before approving execution.

### Audit albums before choosing a plan

For a typical discography intake, filter the catalog before asking for any copy plan. A useful prompt is:

> List the incoming albums and descend into disc subfolders where needed. Recommend only albums to organize: exclude live releases and one-track singles. Group duplicate editions by artist and canonical album name; when the releases contain the same album, prefer the complete version with the higher audio bitrate and report the version left out. Identify compilations by comparing normalized track titles across the catalog; exclude a release when many of its tracks already occur on other albums, and report its overlap count. Keep all excluded source folders untouched. Return a proposed dry-run plan only.

The audit should state its decisions explicitly: the chosen and excluded duplicate editions with their quality, the live and single releases excluded, and the matching-track count that caused a release to be treated as a compilation. Keep editions with materially different track lists or uncertain matches out of the recommendation until they are reviewed, rather than silently discarding them.

Duplicate-track reports should state each matching track title, its album, and its duration so distinct versions are not mistaken for accidental duplicates.

### Work with audiobooks

> Validate `incoming/book.m4b` and report its embedded author, narrator, title, and filename issues.

> Dry-run copy and rename `incoming/book.m4b` into the configured audiobook destination using its validated metadata. Show the proposed output name but do not execute.

The MCP tools also support crawling source folders, converting files, merging audiobooks, and setting destination-copy metadata. Treat each write-capable audiobook operation the same way: dry run, inspect the result, then issue a separate request that explicitly authorizes execution.

## MCP tool surface

| Tool | Purpose | Writes when executed |
| --- | --- | --- |
| `manage_albums_list` | List immediate album entries in source. | No |
| `manage_albums_summarize_source_dir` | Inspect one flat album directory. | No |
| `manage_albums_validate` | Validate tags, tracks, and destinations. | No |
| `manage_albums_organize_files` | Plan or publish album copies and metadata repairs. | Yes |
| `manage_audiobooks_validate` / `manage_audiobooks_crawl` | Inspect audiobooks and folders. | No |
| `manage_audiobooks_copy_and_rename` | Plan or publish a renamed audiobook copy. | Yes |
| `manage_audiobooks_convert_file` / `manage_audiobooks_merge` | Plan or perform conversion and merge work. | Yes |
| `manage_audiobooks_set_metadata` | Plan or update metadata on a destination copy. | Yes |

For exact input schemas, transport details, path rules, and response parsing, see the [MCP server guide](docs/mcp-server.md). It also documents how to use `./` for album files directly in a configured root, slash-terminated album folders, and the JSON array carried in each tool result's text content.

## Safety behavior

- Read-only tools never write files; write-capable tools require `execute: true` to publish changes.
- Source audio and artwork remain unchanged; metadata repairs are made on destination copies.
- Destination collisions, unsupported sidecars, subdirectories, and symlinks fail before publication unless the relevant ignore option is deliberately selected.
- Album art is planned alongside audio so a review includes the full output.
- Organization preflights the complete plan before writing destination audio or artwork.

See [album organization](docs/album-organization.md) for operation semantics and [the inline metadata contract](docs/organize-files-set-metadata.md) for per-track metadata repair.

## Development

```sh
npm run build
npm test
npm run lint
npm run test:coverage
```

For focused tests, use the locally installed Vitest binary:

```sh
./node_modules/.bin/vitest run __tests__/commands/manage-albums/
```

See [testing](docs/testing.md) for test layout and web smoke tests. The project also offers REST and GraphQL interfaces; see the [GraphQL guide](docs/graphql.md) when those are a better fit than MCP.

## License

ISC. See `package.json` for package metadata.
