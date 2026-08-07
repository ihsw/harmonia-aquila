# `allowMultipleAlbums` for `organize-files` (albums only)

Adds an opt-in flag to `manage-albums organize-files` on all four execution surfaces — CLI
`--allow-multiple-albums`, REST, GraphQL, MCP — letting one run produce more than one
`Artist/Album` destination directory. Two things follow from that and are the real substance of
the spec: disc-set validation must be scoped per destination album (otherwise two albums that both
start at track 1 fail with a *disc* error before the album guard is reached), and **both**
single-album guards must be gated, since `assertSingleArtistPerAlbumDirectory` rejects distinct
albums that merely share a title. Album art, which then has no unambiguous album, is reported as
excluded rather than guessed at.

Scope: **`organize-files` only.** No changes to `manage-albums validate`, to the guards in
`organization-plan.ts`, or to `manage-audiobooks`.

Open decision 1 in `design.md` §12 — gating both guards — is worth confirming before
implementation starts; `tasks.md` task 1.4 is a gate for it.

- [requirements.md](./requirements.md)
- [design.md](./design.md) — §1–§7, §9, §10, §12
- [design-testing.md](./design-testing.md) — §8 test updates, §11 verification
- [tasks.md](./tasks.md)
