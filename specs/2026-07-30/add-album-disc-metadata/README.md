# Album Disc Metadata Support

This spec adds normalized disc number/total handling across `manage-albums`
validation, fix-tags, organization, summary, and their REST, GraphQL, and MCP
surfaces. Inference is opt-in and dry-run visible; existing single-disc output
paths remain unchanged.

Scope: **album domain, adapters, focused tests/collections, and related docs
only.** No audiobook, dependency, root-routing, `etc/**`, or real media changes.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
