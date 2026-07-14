# Requirements: Correct Missing Audiobook Metadata

## 1. Background

The source tree contains two M4B files with no performer or album/title
metadata, but each filename has an unambiguous `Author - Title` form:

- `done/Robert Baer - Sleeping with the Devil.m4b`
- `done/Robert Kiyosaki - Rich Dad Poor Dad.m4b`

`manage-audiobooks set-metadata` can create a metadata-corrected copy without
modifying either source. A deliberately noncanonical staging filename lets
`copy-and-rename` create the final metadata-derived M4B in
`etc/audiobooks/3-renamed-files/`.

## 2. Goal

Create, validate, and preserve final M4B copies for the two eligible sources,
using only author and title values explicitly split from their filenames.

## 3. Scope

### In scope

- The two source M4Bs named in §1.
- Metadata-corrected copies in
  `etc/audiobooks/2-aggregated-files/metadata-corrected/`.
- Final M4Bs in `etc/audiobooks/3-renamed-files/`.
- Saved dry-run, execution, and validation JSON artifacts.

### Out of scope

- Editing metadata in a source file.
- Inferring metadata from a one-part filename or folder name.
- Processing `Angry White Men.m4a` or the 35 MP3s under
  `The Wealth and Poverty of Nations A/`.
- Overwriting an existing staging or final destination.

## 4. Functional Requirements

- **FR-1** The workflow MUST process only the two author-title pairs in
  `design.md` §2.1.
- **FR-2** Each `set-metadata` operation MUST copy the source into the named
  staging path, set title → album and author → artist, and use author as the
  default narrator.
- **FR-3** Each staging filename MUST intentionally differ from the
  metadata-derived filename so `copy-and-rename` accepts it.
- **FR-4** Each staging copy MUST first have a successful `set-metadata` dry
  run, then an executed metadata copy, before `copy-and-rename` begins.
- **FR-5** Each staging M4B MUST have a successful `copy-and-rename` dry run,
  execution, and final `validate` result.
- **FR-6** Candidates without two distinct author and title parts MUST remain
  excluded.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every file modification** After every repository file
  modification, `npm run lint` MUST run and all reported issues MUST be fixed
  before continuing.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Source preservation** The two source M4Bs MUST remain unchanged.
- **NFR-4 — Destination safety** Staging and final paths MUST be absent before
  execution; no overwrite behavior MAY be used.
- **NFR-5 — Auditability** Retain JSON output from every dry run, execution,
  and validation until human review is complete.

## 6. Acceptance Criteria

1. Both staging copies have `album` equal to the derived title, `artist` equal
   to the derived author, and writer equal to the author.
2. Both final M4Bs validate as `Author - Title.m4b`.
3. The two source M4Bs remain unchanged.
4. No excluded input is processed.
