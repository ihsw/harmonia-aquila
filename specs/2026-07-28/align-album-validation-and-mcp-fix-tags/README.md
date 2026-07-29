# Album Validation Collision Parity and MCP Fix-Tags Album Selection

This spec makes `manage-albums validate` reject the same normalized
multi-artist/same-album output conflict as `organize-files`, across CLI, REST,
GraphQL, and MCP. It also gives the MCP `manage_albums_fix_tags` tool a
source-root-confined `albumDir` input while preserving scratch-only output.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
