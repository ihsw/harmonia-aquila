# MCP server

This document records the intended Model Context Protocol (MCP) server for
Harmonia Aquila. The server exposes the same album and audiobook operations as
the `manage-albums` and `manage-audiobooks` CLI supercommands.

## Current scoped web endpoint

`web serve` also exposes a scoped Streamable HTTP endpoint at `/mcp`. That web
endpoint is intentionally limited to one read-only tool,
`manage_albums_summarize_source_dir`, and resolves all paths inside the
configured `--source-dir`.

The rest of this document describes a broader future stdio MCP server and should
not be read as the current `web serve` tool surface.

## Goals

- Run as a separate MCP stdio process.
- Keep the existing Commander CLI and its behavior unchanged.
- Expose structured inputs and outputs rather than CLI arguments and console
  output.
- Preserve dry-run-first behavior and all existing validation, collision, and
  source-preservation safeguards.

## Server entrypoint and dependencies

Add `@modelcontextprotocol/sdk` and `zod` dependencies, and create an MCP
entrypoint such as `src/mcp/index.ts`. The entrypoint should create an MCP
server, register the tools below, and connect through
`StdioServerTransport`.

Add a package script and, if distribution requires it, a separate executable:

```json
{
  "scripts": {
    "mcp": "node ./build/dist/mcp/index.js"
  }
}
```

The server must not share `src/index.ts`, which remains the Commander CLI
entrypoint.

## Tool surface

Register one MCP tool for every CLI subcommand.

| MCP tool | CLI command |
| --- | --- |
| `album_summarize_source_dir` | `manage-albums summarize-source-dir` |
| `album_fix_tags` | `manage-albums fix-tags` |
| `album_organize_files` | `manage-albums organize-files` |
| `audiobook_validate` | `manage-audiobooks validate` |
| `audiobook_copy_and_rename` | `manage-audiobooks copy-and-rename` |
| `audiobook_crawl` | `manage-audiobooks crawl` |
| `audiobook_merge` | `manage-audiobooks merge` |
| `audiobook_convert_file` | `manage-audiobooks convert-file` |
| `audiobook_set_metadata` | `manage-audiobooks set-metadata` |

Do not expose a generic command-execution tool. Tool schemas must be explicit
and only permit the inputs supported by the corresponding operation.

## Input and output contracts

Use Zod schemas with native types:

- Paths and metadata values are strings.
- `limit`, `jobs`, and `concurrency` are positive or non-negative integers as
  required by their current CLI validation.
- Repeated `--file-name` values become a `fileNames: string[]` field.
- CLI strategy values become enums:
  `destinationStrategy`, `albumStrategy`, `albumArtistsStrategy`,
  `producerStrategy`, `artistFilenameStrategy`, and
  `titleFilenameStrategy`.
- Omit the CLI-only `format` option. MCP responses always return structured
  JSON-compatible data.

Tool results should contain the same row objects currently emitted by each
CLI command's `--format json` mode. A tool response may additionally provide
a short text summary, but the row objects are the stable machine-readable
result.

## Service extraction

The current command registrations combine Commander option parsing, error
reporting, console output, and operation logic. Extract each operation into a
typed service function before registering it with MCP.

Each service function should:

1. Accept validated native TypeScript options.
2. Return the existing JSON-output row type.
3. Throw normal, descriptive errors for invalid inputs and failed operations.
4. Perform no console output.

The Commander command action remains as an adapter: parse its string options,
call the service, and use `writeRows` to preserve current plaintext and JSON
CLI behavior. The MCP handler validates its Zod input, calls the same service,
and returns its rows as structured content. MCP handlers must not spawn the
CLI executable.

## Write safety

The following tools are read-only:

- `album_summarize_source_dir`
- `audiobook_validate`
- `audiobook_crawl`

All remaining tools can write files or metadata. Their `execute` input must
default to `false`; the dry-run result must be returned unless a caller
explicitly passes `execute: true`.

Advertise read-only tools with MCP read-only annotations. Advertise all
writing tools as destructive, including `audiobook_merge` and
`audiobook_convert_file`, which invoke Docker and `m4b-tool` when executed.
Continue to reject existing destinations and duplicate planned destinations.
Never turn existing exclusive-copy or source-preservation behavior into
overwrite behavior.

## Operation-specific requirements

- Album tools retain `.flac`/`.mp3` validation and the flat-source-directory
  requirement. `ignoreNonAudioFiles` remains explicit.
- Audiobook validation, copy/rename, crawl, and metadata setting retain their
  M4B-only requirements and exact `Performer - Title.m4b` filename checks.
- Merge and conversion retain `m4b-tool` job and concurrency limits, Docker
  error propagation, metadata-derived destinations, and post-write M4B
  validation.
- `audiobook_set_metadata` continues to copy to a distinct destination and
  validates written metadata before reporting success.

## Client configuration

After building, a client can launch the server over stdio with a configuration
equivalent to:

```json
{
  "mcpServers": {
    "harmonia-aquila": {
      "command": "node",
      "args": ["/absolute/path/to/harmonia-aquila/build/dist/mcp/index.js"]
    }
  }
}
```

The process's working directory and filesystem permissions determine which
audio files it can inspect or modify. The MCP server should write protocol
messages only to stdout; diagnostics belong on stderr.

## Verification

Add tests that cover MCP initialization and tool discovery, then invoke each
tool through the MCP client transport. Verify dry-run rows and validation
errors for every tool. Use temporary directories for filesystem tests and
mock or isolate Docker-backed merge/conversion tests so they do not require
an image pull during the normal test suite.
