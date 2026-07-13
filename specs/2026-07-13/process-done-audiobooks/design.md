# Design: Process Done Audiobooks

> Scope reminder: process only the listed `done` sources into new files in
> `etc/audiobooks/3-renamed-files/`. Do not edit metadata, overwrite a
> destination, or use `npx`.

## 1. Overview

The workflow chooses an action only when embedded metadata supplies an
unambiguous destination identity. `copy-and-rename` handles a single
filename-invalid M4B; `merge` handles an MP3 set that shares one source
directory, performer, and album. There are no standalone complete non-M4B
files, so `convert-file` has no work (FR-1–FR-5).

Every action begins with its documented dry run. Execute only when the output
matches the manifest, then validate the resulting M4B. Source mounts are
read-only, and the commands reject destination collisions (FR-3, NFR-3–NFR-5).

## 2. Action manifests

### 2.1 `copy-and-rename` — 16 unique M4B candidates

| Source relative to `done/` | Expected destination |
| --- | --- |
| `Thinking Fast and Slow/Thinking Fast and Slow/Thinking, Fast and Slow.m4b` | `Daniel Kahneman - Thinking, Fast and Slow (Unabridged).m4b` |
| `Edward Gibbon - The Decline and Fall of the Roman Empire.m4b` | `Edward Gibbon - The Decline and Fall of the Roman Empire, Volume One.m4b` |
| `George Orwell - 1984.m4b` | `George Orwell - 1984 [Disc 1].m4b` |
| `A History of Egypt from the Earliest Times to the Persian Conquest - James Henry Breasted (M4B)/A History of Egypt from the Earliest Times to the Persian Conquest.m4b` | `James Henry Breasted - A History of Egypt from the Earliest Times to the Persian Conquest.m4b` |
| `The Future for Investors.m4b` | `Jeremy J. Siegel - The Future for Investors, Why the Tried and the True Triumph Over the Bold and the New.m4b` |
| `Joe Studwell - How Asia Works.m4b` | `Joe Studwell - How Asia Works (Unabridged).m4b` |
| `White Kids Growing Up with Privilege in a Racially Divided America.m4b` | `Margaret A. Hagerman - White Kids: Growing Up with Privilege in a Racially Divided America.m4b` |
| `Robert Baer - See No Evil.m4b` | `Robert Baer - See No Evil: The True Story of a Ground Soldier in the CIA's War Against Terrorism.m4b` |
| `Robert Baer - The Devil We Know.m4b` | `Robert Baer - The Devil We Know - Dealing with the New Iranian Superpower.m4b` |
| `Sandy Mitchell - Ciaphas Cain For the Emperor Warhammer 40,000 (Unabridged)/Ciaphas Cain For the Emperor Warhammer 40,000 (Unabridged).m4b` | `Sandy Mitchell - Ciaphas Cain: For the Emperor (Unabridged).m4b` |
| `Sandy Mitchell - Ciaphas Cain The Anthology.m4b` | `Sandy Mitchell - Ciaphas Cain: The Anthology.m4b` |
| `Fire and Blood A History of Mexico.m4b` | `T. R. Fehrenbach - Fire and Blood: A History of Mexico.m4b` |
| `Tim Wu - The Master Switch.m4b` | `Tim Wu - The Master Switch (Unabridged).m4b` |
| `The Right Stuff (Unabridged).m4b` | `Tom Wolfe - The Right Stuff (Unabridged).m4b` |
| `The Rise of the West - William H McNeill (M4B)/The Rise of the West.m4b` | `William H. McNeill - The Rise of the West (Unabridged).m4b` |
| `Winston Churchill - The River War/The River War.m4b` | `Winston Churchill - The River War (Unabridged).m4b` |

### 2.2 `merge` — five complete M4B or MP3 sets

| Source relative to `done/` | Source files | Expected destination |
| --- | ---: | --- |
| `China A History (Unabridged)/` | 19 | `John Keay - China (Unabridged).m4b` |
| `Dying of Whiteness - Jonathan Michel Metzl (MP3)/` | 31 | `Jonathan M. Metzl - Dying of Whiteness: How the Politics of Racial Resentment Is Killing America's Heartland.m4b` |
| `Nancy Isenberg -- White Trash - The 400-Year Untold History of Class in America (2016)/` | 22 M4Bs | `Nancy Isenberg - White Trash (Unabridged).m4b` |
| `Tamim Ansary - Destiny Disrupted/` | 92 | `Tamim Ansary - Destiny Disrupted.m4b` |
| `White Like Me - Book 14 MP3/` | 14 | `Tim Wise - White Like Me - Reflections on Racism from a Privileged Son.m4b` |

### 2.3 `convert-file` — no candidates

No non-M4B input has both an embedded artist and album while standing alone in
its source directory. Do not invoke `convert-file` for this audit.

### 2.4 Unsuitable — do not process

| Category | Inputs | Reason |
| --- | ---: | --- |
| Missing metadata | `Angry White Men.m4a`, `Robert Baer - Sleeping with the Devil.m4b`, and `Robert Kiyosaki - Rich Dad Poor Dad.m4b` | Required identity metadata is absent. |
| Missing metadata | 35 MP3 files under `The Wealth and Poverty of Nations A/` | Performer and album metadata are absent for every part. |
| Already-valid M4B — copy to destination | `Thomas Sowell - The Vision of the Anointed.m4b` and `Timothy Snyder - Bloodlands Europe Between Hitler and Stalin.m4b` | Each filename already matches its album-first metadata-derived destination. `copy-and-rename` intentionally rejects valid sources, so copy each source directly to `etc/audiobooks/3-renamed-files/` with no-clobber behavior, then validate it. |

## 3. Command patterns

For each §2.1 row, dry run then execute:

```sh
node build/dist/index.js manage-audiobooks copy-and-rename \
  --file-name "etc/audiobooks/1-source-files/done/<source>" \
  --dest-dir etc/audiobooks/3-renamed-files \
  --format json
```

For each §2.2 row, dry run then execute:

```sh
node build/dist/index.js manage-audiobooks merge \
  --source-dir "etc/audiobooks/1-source-files/done/<source-directory>" \
  --dest-dir etc/audiobooks/3-renamed-files \
  --jobs 4 \
  --format json
```

Add `--execute` only after confirming the dry-run destination. Validate every
created path with `manage-audiobooks validate --file-name <destination>
--format json`.

For each already-valid M4B in §2.4, preserve the filename while copying to the
destination:

```sh
cp --no-clobber --preserve=all \
  "etc/audiobooks/1-source-files/done/<source>" \
  "etc/audiobooks/3-renamed-files/<same filename>"
```

Then run `manage-audiobooks validate --file-name <destination> --format json`.

## 4. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Metadata differs from the manifest | Low | Stop at dry run; do not execute. |
| Existing destination | Medium | Treat as a conflict; do not overwrite. |
| Long MP3 merge fails | Medium | Preserve source and partial output for review; stop that set. |
| Metadata-derived title is unexpectedly chapter-like | Medium | Preserve source and obtain metadata correction approval; do not invent a title. |
| M4B-part merge fails | Medium | Preserve all 22 White Trash source parts and any partial output for review. |
| Already-valid copy conflicts | Low | Use `cp --no-clobber`; preserve the existing destination and stop for review. |

## 5. Verification

1. Run `npm run build` and `npm run lint` before processing.
2. Save every dry-run and execution JSON output.
3. Validate all 23 created M4Bs with `manage-audiobooks validate --format json`.
4. Confirm every source remains present and every unsuitable candidate remains
   untouched.
