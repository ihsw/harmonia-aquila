# Harmonia Aquila

Harmonia Aquila is a TypeScript toolkit for safely inspecting, repairing, and organizing local music albums and M4B audiobooks. It provides a CLI, REST and GraphQL web interfaces, and a Streamable HTTP [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) endpoint.

The organizer works dry-run first: it plans metadata changes and destination paths before copying anything. Source audio and artwork are never modified during organization.

## Features

- Audit and organize FLAC and MP3 albums, including adjacent cover art.
- Validate album metadata, destination paths, duplicate tracks, and disc numbering.
- Concatenate ordered disc folders while preserving local track numbers and writing canonical disc metadata.
- Repair metadata on destination copies with album, artist, album-artist, disc, and per-track overrides.
- Inspect, rename, convert, merge, and tag M4B audiobooks.
- Expose the same album and audiobook workflows through REST, GraphQL, and MCP.

## Getting started

Install dependencies and build the CLI:

```sh
npm install
npm run build
./build/dist/index.js --help
```

The build produces the `harmonia-aquila` executable at `build/dist/index.js`. You can also install the package and use the declared `harmonia-aquila` binary.

## Album workflow

Work with one flat album directory at a time. Inspect and validate it before planning organization:

```sh
./build/dist/index.js manage-albums summarize-source-dir \
  --dir-name /music/incoming/album \
  --format json

./build/dist/index.js manage-albums validate \
  --dir-name /music/incoming/album \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json
```

Create a dry-run plan, review every output row, then repeat the exact command with `--execute`:

```sh
./build/dist/index.js manage-albums organize-files \
  --source-dir /music/incoming/album \
  --dest-dir /music/organized \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json

./build/dist/index.js manage-albums organize-files \
  --source-dir /music/incoming/album \
  --dest-dir /music/organized \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json \
  --execute
```

For a multi-disc release stored in ordered flat folders, use concatenation. It assigns disc position from directory order while retaining each disc's local track numbers:

```sh
./build/dist/index.js manage-albums organize-files \
  --source-dirs /music/incoming/disc-1 /music/incoming/disc-2 \
  --dest-dir /music/organized \
  --disc-strategy concatenate \
  --album-art-strategy first \
  --format json
```

By default, an existing destination is an error. Do not use overwrite behavior until the exact destination file has been reviewed.

See [album organization](docs/album-organization.md) and the [inline metadata contract](docs/organize-files-set-metadata.md) for all available repair strategies.

## Audiobooks

Audiobook commands operate on M4B files:

```sh
./build/dist/index.js manage-audiobooks validate --file-name incoming/book.m4b
./build/dist/index.js manage-audiobooks copy-and-rename \
  --file-name incoming/book.m4b \
  --dest-dir organized \
  --format json
```

Run `./build/dist/index.js manage-audiobooks --help` for crawling, conversion, merging, and metadata commands.

## Web, GraphQL, and MCP server

Build first, then start the web service with scoped source, scratch, and destination roots:

```sh
npm run build
npm run web:serve -- \
  --source-dir /music/source \
  --scratch-dir /music/scratch \
  --dest-dir /music/organized \
  --host 127.0.0.1 \
  --port 3000
```

The MCP endpoint is available at `http://127.0.0.1:3000/mcp`. It is stateless and uses Streamable HTTP. See [the MCP server guide](docs/mcp-server.md) and [the GraphQL guide](docs/graphql.md) for request contracts and examples.

## Development

```sh
npm run build
npm test
npm run lint
npm run test:coverage
```

For focused tests, use the locally installed Vitest binary rather than `npx`:

```sh
./node_modules/.bin/vitest run __tests__/commands/manage-albums/
```

See [testing](docs/testing.md) for the test layout, coverage thresholds, and web smoke-test instructions.

## Safety model

- Organization defaults to dry-run; only `--execute` publishes destination copies.
- Source audio and source artwork remain unchanged.
- Album art is planned with audio in the same operation.
- Unsupported sidecars, subdirectories, and symlinks are rejected unless explicitly ignored.
- Exact destination collisions fail before audio or artwork is written.

## License

ISC. See `package.json` for package metadata.
