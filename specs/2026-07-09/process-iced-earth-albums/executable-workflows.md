# Executable workflows: Iced Earth

Each row is driven by its versioned metadata manifest under
`metadata/<id>.csv`. Run `fix-tags --set-metadata metadata/<id>.csv` (dry-run,
review, then `--execute`), then `organize-files --artist-filename-strategy
artist`. `--set-metadata` supplies artist, album, track number, and title, so
`--set-artist`, `--set-album`, and `--reset-track` are not used (they conflict).
See `docs/fix-tags-set-metadata.md` for the manifest contract and CSV example.
Copy the listed front image to `Iced Earth/<Final album>/cover.jpg` only after
that row organizes successfully.

| ID | Source directory relative to source root | Final album | Tracks | Metadata manifest | Artwork relative to source root |
|---|---|---|---:|---|---|
| `iced-earth-1991` | `Iced Earth - 1991 - Iced Earth [EAC-FLAC]` | `Iced Earth` | 8 | `metadata/iced-earth-1991.csv` | `Iced Earth - 1991 - Iced Earth [EAC-FLAC]/Front.jpg` |
| `night-of-the-stormrider` | `Iced Earth - 1992 - Night of the Stormrider [EAC-FLAC]` | `Night of the Stormrider` | 9 | `metadata/night-of-the-stormrider.csv` | `Iced Earth - 1992 - Night of the Stormrider [EAC-FLAC]/Front.jpg` |
| `burnt-offerings` | `Iced Earth - 1995 - Burnt Offerings [EAC-FLAC]` | `Burnt Offerings` | 8 | `metadata/burnt-offerings.csv` | `Iced Earth - 1995 - Burnt Offerings [EAC-FLAC]/Front.jpg` |
| `days-of-purgatory-disc-1` | `Iced Earth - 1997 - Days of Purgatory [EAC-FLAC]/01` | `Days of Purgatory (Disc 1)` | 11 | `metadata/days-of-purgatory-disc-1.csv` | `Iced Earth - 1997 - Days of Purgatory [EAC-FLAC]/Iced Earth - Days Of Purgatory - Front.jpg` |
| `days-of-purgatory-disc-2` | `Iced Earth - 1997 - Days of Purgatory [EAC-FLAC]/02` | `Days of Purgatory (Disc 2)` | 10 | `metadata/days-of-purgatory-disc-2.csv` | `Iced Earth - 1997 - Days of Purgatory [EAC-FLAC]/Iced Earth - Days Of Purgatory - Front.jpg` |
| `something-wicked` | `Iced Earth - 1998 - Something Wicked this Way Comes [EAC-FLAC]` | `Something Wicked This Way Comes` | 13 | `metadata/something-wicked.csv` | `Iced Earth - 1998 - Something Wicked this Way Comes [EAC-FLAC]/Front.jpg` |
| `alive-in-athens-disc-1` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/01` | `Alive in Athens (Disc 1)` | 10 | `metadata/alive-in-athens-disc-1.csv` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/Iced Earth - Alive In Athens - Front (1-3).jpg` |
| `alive-in-athens-disc-2` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/02` | `Alive in Athens (Disc 2)` | 12 | `metadata/alive-in-athens-disc-2.csv` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/Iced Earth - Alive In Athens - Front (2-3).jpg` |
| `alive-in-athens-disc-3` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/03` | `Alive in Athens (Disc 3)` | 9 | `metadata/alive-in-athens-disc-3.csv` | `Iced Earth - 1999 - Alive in Athens [EAC-FLAC]/Iced Earth - Alive In Athens - Front (3-3).jpg` |
| `the-melancholy` | `Iced Earth - 1999 - The Melancholy (EP) [EAC-FLAC]` | `The Melancholy (EP)` | 7 | `metadata/the-melancholy.csv` | `Iced Earth - 1999 - The Melancholy (EP) [EAC-FLAC]/Iced Earth - Melancholy - Front.jpg` |
| `dark-genesis-disc-1` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/01 - enter the realm` | `Dark Genesis - Enter the Realm (Disc 1)` | 6 | `metadata/dark-genesis-disc-1.csv` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/Iced Earth - Dark Genesis - Front.jpg` |
| `dark-genesis-disc-2` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/02 - iced earth` | `Dark Genesis - Iced Earth (Disc 2)` | 8 | `metadata/dark-genesis-disc-2.csv` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/Iced Earth - Dark Genesis - Front.jpg` |
| `dark-genesis-disc-3` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/03 - night of the stormrider` | `Dark Genesis - Night of the Stormrider (Disc 3)` | 9 | `metadata/dark-genesis-disc-3.csv` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/Iced Earth - Dark Genesis - Front.jpg` |
| `dark-genesis-disc-4` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/04 - burnt offerings` | `Dark Genesis - Burnt Offerings (Disc 4)` | 8 | `metadata/dark-genesis-disc-4.csv` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/Iced Earth - Dark Genesis - Front.jpg` |
| `dark-genesis-disc-5` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/05 - tribute to the gods` | `Dark Genesis - Tribute to the Gods (Disc 5)` | 11 | `metadata/dark-genesis-disc-5.csv` | `Iced Earth - 2001 - Dark Genesis [EAC-FLAC]/Iced Earth - Dark Genesis - Front.jpg` |
| `horror-show` | `Iced Earth - 2001 - Horror Show [EAC-FLAC]` | `Horror Show` | 11 | `metadata/horror-show.csv` | `Iced Earth - 2001 - Horror Show [EAC-FLAC]/Iced Earth - Horror Show - Front.jpg` |
| `the-glorious-burden-disc-1` | `Iced Earth - 2004 - The Glorious Burden [EAC-FLAC]/01` | `The Glorious Burden (Disc 1)` | 11 | `metadata/the-glorious-burden-disc-1.csv` | `Iced Earth - 2004 - The Glorious Burden [EAC-FLAC]/Iced Earth - The Glorious Burden - Front.jpg` |
| `the-glorious-burden-disc-2` | `Iced Earth - 2004 - The Glorious Burden [EAC-FLAC]/02` | `The Glorious Burden (Disc 2)` | 3 | `metadata/the-glorious-burden-disc-2.csv` | `Iced Earth - 2004 - The Glorious Burden [EAC-FLAC]/Iced Earth - The Glorious Burden - Front.jpg` |
| `framing-armageddon` | `Iced Earth - 2007 - Framing Armageddon [EAC-FLAC]` | `Framing Armageddon` | 19 | `metadata/framing-armageddon.csv` | `Iced Earth - 2007 - Framing Armageddon [EAC-FLAC]/Front.jpg` |
| `overture-of-the-wicked` | `Iced Earth - 2007 - Overture of the Wicked [EAC-FLAC]` | `Overture of the Wicked` | 4 | `metadata/overture-of-the-wicked.csv` | `Iced Earth - 2007 - Overture of the Wicked [EAC-FLAC]/Iced Earth - Overture Of The Wicked - Front.jpg` |

20 executable disc workflows organize 187 tracks now. All 21 workflows (including the blocked Dark Saga) have committed manifests totaling 197 records.

| Blocked ID | Source | Final album | Tracks | Metadata manifest | Reason |
|---|---|---|---:|---|---|
| `the-dark-saga` | `Iced Earth - 1996 - The Dark Saga [EAC-FLAC]` | `The Dark Saga` | 10 | `metadata/the-dark-saga.csv` | Source file `02 - i died for you.flac` has a corrupted FLAC header (`FLAC header not found after any starting tags`), so `fix-tags` cannot read the flat source directory. The manifest is validated independently and may be applied via `--set-metadata` once the source is repaired. |
| `the-crucible-of-man-ape` | `Iced Earth - 2008 - The Crucible of Man [EAC-APE]/CDImage.ape` | — | — | — | `.ape` is unsupported and the cue-based image has not been split into tracks. |
