# Design: Correct Missing Audiobook Metadata

> Scope reminder: process only the two listed M4B sources into new staging and
> final files. Never modify a source, overwrite a destination, or use `npx`.

## 1. Overview

The filename parser accepts exactly two nonempty parts separated by ` - `.
The left part supplies author and the right part supplies title. This is a
strict naming convention, not a metadata inference mechanism: a filename or
folder without two distinct parts is excluded (FR-1, FR-6).

`set-metadata` creates a staging copy with the supplied tags. The staging name
adds `.metadata-fixed` before `.m4b`, ensuring it does not already match
`Author - Title.m4b`. `copy-and-rename` can then create the final canonical
name from the corrected embedded metadata (FR-2–FR-5).

## 2. Candidate manifest

### 2.1 Eligible author-title pairs

| Source relative to `1-source-files/` | Author | Title | Metadata staging copy | Final destination |
| --- | --- | --- | --- | --- |
| `done/Robert Baer - Sleeping with the Devil.m4b` | Robert Baer | Sleeping with the Devil | `2-aggregated-files/metadata-corrected/Robert Baer - Sleeping with the Devil.metadata-fixed.m4b` | `3-renamed-files/Robert Baer - Sleeping with the Devil.m4b` |
| `done/Robert Kiyosaki - Rich Dad Poor Dad.m4b` | Robert Kiyosaki | Rich Dad Poor Dad | `2-aggregated-files/metadata-corrected/Robert Kiyosaki - Rich Dad Poor Dad.metadata-fixed.m4b` | `3-renamed-files/Robert Kiyosaki - Rich Dad Poor Dad.m4b` |

### 2.2 Excluded inputs

| Inputs | Reason |
| --- | --- |
| `done/Angry White Men.m4a` | Not an M4B and has no distinct author-title pair. |
| 35 MP3s under `done/The Wealth and Poverty of Nations A/` | Not M4Bs and neither filenames nor containing folder provide an author-title pair. |
| Any future missing-metadata file without exactly one `Author - Title` split | Do not infer or invent metadata. |

## 3. Command pattern

For each §2.1 row, dry run then execute:

```sh
node build/dist/index.js manage-audiobooks set-metadata \
  --source-filepath "etc/audiobooks/1-source-files/<source>" \
  --dest-filepath "etc/audiobooks/<metadata staging copy>" \
  --title "<title>" \
  --author "<author>" \
  --format json
```

Add `--execute` only after confirming the row. The omitted `--narrator`
defaults to the author.

Then dry run and execute:

```sh
node build/dist/index.js manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/<metadata staging copy>" \
  --dest-dir etc/audiobooks/3-renamed-files \
  --format json
```

Finally, validate the final destination:

```sh
node build/dist/index.js manage-audiobooks validate \
  --file-name "etc/audiobooks/3-renamed-files/<Author - Title.m4b>" \
  --format json
```

## 4. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Filename split is ambiguous | Low | Only accept exactly one nonempty `Author - Title` split. |
| Staging name is already canonical | Low | Require the `.metadata-fixed` suffix before using `copy-and-rename`. |
| Existing staging or final path | Low | Stop; do not overwrite. |
| Metadata write fails | Medium | Preserve source and failed staging copy for review. |
| Final validation fails | Low | Preserve source and staging copy; quarantine final output for review. |

## 5. Verification

1. Run `npm run build` and `npm run lint` before processing.
2. Save all dry-run and execution JSON output.
3. Validate the two final M4Bs with `manage-audiobooks validate --format json`.
4. Confirm both source files remain unchanged and all excluded inputs remain
   untouched.
