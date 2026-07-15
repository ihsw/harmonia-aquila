# Design: Correct Audiobook Metadata

> Scope reminder: modify only the conversion and M4B metadata commands and, if
> required, the m4b-tool adapter; create only the manifest files below. Do not
> alter sources, overwrite a destination, or use `npx`.

## 1. Overview

`convert-file` will gain an all-or-nothing metadata override. When author,
title, and narrator are all present, it uses author and title rather than
reading missing source tags; otherwise it retains the current metadata-reading
path. Partial overrides fail before Docker is invoked (FR-1–FR-3).

The M4A conversion writes an intermediate M4B because conversion establishes
the metadata-derived name while `set-metadata` is the established writer-tag
workflow. The existing M4B can be copied directly to its final canonical name.
Both finals are validated after writing (FR-4–FR-7).

`m4b-tool meta` title-cases supplied album metadata, which violates the exact
title in the manifest. `set-metadata` therefore writes its copied M4B through
the existing `node-taglib-sharp` dependency and verifies it with
`music-metadata` (FR-8).

## 2. Manifest

| Source relative to `1-source-files/` | Intermediate M4B | Final destination | Author | Title | Narrator |
| --- | --- | --- | --- | --- | --- |
| `renaming/How To Win Friends & Influence People.m4b` | None | `3-renamed-files/Dale Carnegie - How to Win Friends and Influence People.m4b` | Dale Carnegie | How to Win Friends and Influence People | Andrew MacMillan |
| `done/Angry White Men.m4a` | `2-aggregated-files/metadata-corrected/Michael Kimmel - Angry White Men.m4b` | `3-renamed-files/Michael Kimmel - Angry White Men.m4b` | Michael Kimmel | Angry White Men | Aaron Williamson |

## 3. Command changes

### Modified files

```text
src/commands/manage-audiobooks/convert-file.ts  (add explicit metadata override)
src/commands/manage-audiobooks/set-metadata.ts  (preserve exact M4B tag casing)
src/commands/manage-audiobooks/helpers/m4b-tool.ts  (only if narrator must be passed during conversion)
```

`convert-file` receives `--author`, `--title`, and `--narrator`. It MUST
require all three together. An override supplies the effective performer and
title for the existing filename, collision, dry-run, and `m4b-tool` paths.
`narrator` is retained in the conversion record; pass it to `m4b-tool` only if
that tool's supported merge arguments can write writer metadata. The final
`set-metadata` step remains authoritative for narrator metadata.

| Invocation | Effective performer/title |
| --- | --- |
| No override options | Existing embedded `artist` / `album` |
| All three override options | `--author` / `--title` |
| One or two override options | Command error before writing |

## 4. Execution sequence

1. Run `npm run build` and `npm run lint`; confirm all manifest destinations
   are absent.
2. For the first row, dry run and execute `set-metadata` directly to its final
   destination using all stated values, then validate it.
3. For the second row, dry run and execute `convert-file` with all three
   explicit metadata options to the intermediate directory.
4. Dry run and execute `set-metadata` from that intermediate M4B to the final
   destination, supplying the stated author, title, and narrator; then
   validate the final file.
5. Retain every JSON result and confirm sources have not changed.

The conversion command pattern is:

```sh
node build/dist/index.js manage-audiobooks convert-file \
  --file-name "etc/audiobooks/1-source-files/done/Angry White Men.m4a" \
  --author "Michael Kimmel" \
  --title "Angry White Men" \
  --narrator "Aaron Williamson" \
  --dest-dir etc/audiobooks/2-aggregated-files/metadata-corrected \
  --format json
```

Review the dry-run row, then add `--execute`. Use the analogous
`set-metadata` commands with `--format json`, first without and then with
`--execute`.

## 5. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Partial override silently changes behavior | Low | Reject anything other than all three options. |
| M4A conversion cannot use the declared override | Medium | Stop at dry run; do not write or modify the source. |
| Existing destination | Low | Preserve it; never use overwrite behavior. |
| Writer metadata missing after conversion | Medium | Apply and verify it on the intermediate-to-final M4B copy. |
| Final filename mismatch | Low | Require `validate` to return `valid: true`. |

## 6. Verification

After every source code file edit, run:

1. `npm run lint` (NFR-1).

After implementation:

1. `npm run build`
2. `npm run lint`
3. Dry run and execute every manifest operation, retaining JSON output.
4. Run `node build/dist/index.js manage-audiobooks validate --file-name "<final path>" --format json` for both final M4Bs.
5. Compare source checksums from before and after processing.
6. Run `git --no-pager diff --stat -- src/commands/manage-audiobooks` and
   confirm only the §3 files changed.
