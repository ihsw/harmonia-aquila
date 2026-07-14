# Design: Merge Sequential Audiobook Folders

> Scope reminder: inspect source media, create only new destination M4Bs and
> ignored records under `reports/audiobooks/merge-sequential-folders/`. Do not
> change source metadata, remove sources, overwrite a final, or use `npx`.

## 1. Overview

This workflow uses `manage-audiobooks merge` as the sole merger, writing to a
staging directory. Normal mode groups sources by parent directory plus embedded
performer and album-first title. `--bypass-metadata` instead combines all
discovered source files into one M4B named after the requested source folder;
it intentionally emits no performer or title metadata (FR-1–FR-3).

The current 35-part folder uses explicit bypass mode because every part lacks
artist and album/title metadata. Dry-run output is the execution manifest; the
same command gains only `--execute` and still uses `--jobs 16`.
`set-metadata` then copies the staged M4B to the final directory with the
supplied consolidated-book metadata (FR-3–FR-8).

## 2. File layout

### Modified files

```text
etc/audiobooks/2-aggregated-files/merged-sequential/<merge-derived-name>.m4b
etc/audiobooks/3-renamed-files/David S Landes - The Wealth and Poverty of Nations: Why Some Are So Rich and Some So Poor.m4b
reports/audiobooks/merge-sequential-folders/inventory.json
reports/audiobooks/merge-sequential-folders/dry-run.json
reports/audiobooks/merge-sequential-folders/execution.json
reports/audiobooks/merge-sequential-folders/metadata.json
reports/audiobooks/merge-sequential-folders/validation.json
```

### Files explicitly NOT modified

- `etc/audiobooks/1-source-files/` — inspected but never changed.
- Existing `etc/audiobooks/3-renamed-files/*.m4b` — collisions stop the run.
- `src/`, package manifests, lockfiles, and prior specs — no code change.

## 3. Candidate mapping

| Candidate folder | Parts | Current eligibility | Action |
| --- | ---: | --- | --- |
| `done/The Wealth and Poverty of Nations A/` | 35 MP3s, `1.mp3`–`35.mp3` | Use explicit metadata bypass | Merge all parts to `The Wealth and Poverty of Nations A.m4b`, then apply the supplied final metadata. |
| Future sequential folders | ≥2 MP3/M4B files | Eligible only with one complete shared metadata identity | Dry-run, execute to staging, then validate. |

## 4. Command pattern

For an eligible `<source-directory>`, run:

```sh
node build/dist/index.js manage-audiobooks merge \
  --source-dir "etc/audiobooks/1-source-files/<source-directory>" \
  --dest-dir "etc/audiobooks/2-aggregated-files/merged-sequential" \
  --jobs 16 \
  --bypass-metadata \
  --format json
```

The dry run must emit exactly one `would merge` row with the audited source
count and source-folder-derived staged filename. Confirm its staged destination
is absent, then rerun the exact command with `--execute`.

For the Wealth and Poverty set, dry-run then execute the metadata copy:

```sh
node build/dist/index.js manage-audiobooks set-metadata \
  --source-filepath "etc/audiobooks/2-aggregated-files/merged-sequential/<merge-derived-name>.m4b" \
  --dest-filepath "etc/audiobooks/3-renamed-files/David S Landes - The Wealth and Poverty of Nations: Why Some Are So Rich and Some So Poor.m4b" \
  --title "The Wealth and Poverty of Nations: Why Some Are So Rich and Some So Poor" \
  --author "David S Landes" \
  --narrator "Walter Dixon" \
  --format json
```

Add `--execute` only after the dry run confirms the source and final
destination. Validate the final M4B:

```sh
node build/dist/index.js manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/<Performer - Title.m4b>" \
  --format json
```

## 5. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Bypass mode produces an untagged staging M4B | Expected | Apply the supplied metadata only through `set-metadata` before final validation. |
| Parts split into multiple metadata groups | Medium | Stop and remediate deliberately; never merge partial groups. |
| Existing destination is overwritten | Low | Treat the collision as a hard stop. |
| Consolidated metadata is not applied | Low | Dry-run and execute `set-metadata`, then validate the final copy. |
| Long merge exhausts resources | Medium | Use the required `--jobs 16`; run one eligible folder at a time. |

## 6. Verification

After every repository file edit:

1. `npm run lint` (NFR-1).

Before execution:

1. `npm run build` — must exit 0.
2. `npm run lint` — must exit 0.
3. Run the §4 dry-run command and save its JSON.

After each execution:

1. Run the §4 validation command — it must return `"valid": true` and report
   `David S Landes` plus the supplied full title.
2. `find "etc/audiobooks/1-source-files/<source-directory>" -type f` —
   count and paths must match the pre-run inventory.
3. `git --no-pager diff --stat -- src package.json package-lock.json` — output
   must be empty.
