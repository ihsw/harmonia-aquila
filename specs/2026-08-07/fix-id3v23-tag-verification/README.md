# Container-aware tag verification (`src/lib/albums`)

`organize-files --execute` re-reads each staged file and rejects the copy when the tags it reads
back differ from the tags it asked for. On ID3v2.3 that comparison is wrong twice: a multi-value
album-artist list can only be stored `/`-joined in `TPE2`, and `music-metadata` does not surface
the `IPLS` producer frame on `common`. Both make a *successful* write fail with
`Metadata was not persisted`, which is what breaks `--album-artists-strategy aggregate` against the
OC ReMix source. This spec teaches the verifier what each container can actually hold, extracts it
into its own testable module, and names the failing field in the error.

Scope: **`src/lib/albums` verification only.** No changes to the write path (`audio-tags.ts`), to
any planner, or to the CLI/REST/GraphQL/MCP surfaces. The related leftover-album-directory defect
from the same bug report is explicitly out of scope.

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [design-testing.md](./design-testing.md)
- [tasks.md](./tasks.md)
