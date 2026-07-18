# Add Web Serve Supercommand

This spec adds a `web serve` supercommand that starts a NestJS-backed HTTP
server exposing GET/POST routes for existing album and audiobook operations.
It also plans the required `src/lib/**` extraction so `manage-albums`,
`manage-audiobooks`, and `web` share implementation without changing existing
CLI behavior.

Scope: **`src/**`, `__tests__/**`, TypeScript/lint/test config, `package.json`,
and `package-lock.json` only.** No media/operational folder edits.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
