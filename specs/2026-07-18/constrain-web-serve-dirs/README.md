# Constrain Web Serve Directories (`web serve`)

This spec extends the existing `web serve` subcommand with configured source and
destination roots, then constrains applicable route handler path inputs to those
roots to prevent directory traversal.

Scope: **`src/commands/web/**`, `src/web/**`, `__tests__/web/**`, focused web command tests, and directly related package scripts only.** No implementation starts from this spec alone.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
