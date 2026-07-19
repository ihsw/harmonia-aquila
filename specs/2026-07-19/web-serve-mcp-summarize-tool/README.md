# Web Serve MCP Summarize Tool

This spec adds a scoped MCP Streamable HTTP endpoint to `web serve`, exposing
only `manage_albums_summarize_source_dir` and validating it through the existing
Bruno web collection.

Scope: `package.json`, `package-lock.json`, `src/web/**`, `__tests__/web/**`,
`collections/harmonia-aquila-web/**`, `docs/mcp-server.md`, and
`docs/testing.md` only. No broader stdio MCP server and no extra MCP tools.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
