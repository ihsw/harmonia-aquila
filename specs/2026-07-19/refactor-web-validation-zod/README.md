# Refactor Web Validation to Zod (`web serve`)

This spec refactors `web serve` request handlers to validate query/body input
with Zod schemas while preserving existing route behavior, path-root
restrictions, and Bruno collection compatibility.

Scope: **`src/web/**`, `__tests__/web/**`, and `collections/harmonia-aquila-web/**` only if assertions need equivalent updates.**

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
