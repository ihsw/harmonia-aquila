# Tasks: Process Suitable Source Albums

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any processing task below until the user explicitly directs you to.
> - **No `npx`** in any form. Use `npm run <script>` or `./build/dist/index.js`.
> - **Only the candidates listed in §3.1 are executable.** Candidates in §3.2 are blocked by design.
> - **Do not run `fix-tags`** for this spec.
> - Treat `etc/1-source-files/**` as read-only input.
> - Do not edit `src/**`, `package.json`, or `package-lock.json` while executing this spec.
> - Mark the matching `- [x]` checkbox immediately when each task is finished or blocked.

## Phase 1 — Pre-flight

### 1.1 Build and snapshot inputs

- [x] Run `npm run build` and require exit 0.
- [x] Confirm `reports/album-organization-audit/2026-07-09-source-dir-summaries/source-dir-summaries-json/index.json` still reports 65 suitable candidates.
- [x] Create `reports/album-organization-audit/2026-07-09-source-dir-summaries/processing-runs/<run-id>/` with dry-run, execute, blocked, and summary subfolders.
- [x] Confirm the §3.2 duplicate-destination candidates are not queued for execution.

## Phase 2 — Per-candidate execution rule

### 2.1 Required command sequence for every §3.1 candidate

- [x] Run immediate dry-run: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json`.
- [x] Save dry-run stdout/stderr/exit code under `processing-runs/<run-id>/dry-runs/`.
- [x] If dry-run exits non-zero, save a blocked artifact and mark the candidate complete as blocked.
- [x] If dry-run exits 0, run execute: `./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json --execute`.
- [x] Save execute stdout/stderr/exit code under `processing-runs/<run-id>/execute/`.

## Phase 3 — Candidate checklist

### 3.1 Executable candidates

- [x] 001: `BT` - `Beta` (1 tracks, MP3, 128 kbps) from `etc/1-source-files/BT Complete Discography (US Versions)/Beta` -> `BT/Beta`.
- [x] 002: `BT` - `Emotional Technology` (13 tracks, MP3, 160 kbps) from `etc/1-source-files/BT Complete Discography (US Versions)/Emotional Technology` -> `BT/Emotional Technology`.
- [x] 003: `BT` - `Music From And Inspired By The Film Monster` (15 tracks, MP3, 128-206.8 kbps) from `etc/1-source-files/BT Complete Discography (US Versions)/Music From And Inspired By The Film Monster` -> `BT/Music From And Inspired By The Film Monster`.
- [x] 004: `BT` - `Rare & Remixed` (21 tracks, MP3, 128 kbps) from `etc/1-source-files/BT Complete Discography (US Versions)/Rare & Remixed` -> `BT/Rare & Remixed`.
- [x] 005: `BT` - `The Dungeonmaster's Guide` (1 tracks, MP3, 128 kbps) from `etc/1-source-files/BT Complete Discography (US Versions)/The Dungeonmaster's Guide` -> `BT/The Dungeonmaster's Guide`.
- [x] 006: `Cascada` - `How Do You Do CDM` (9 tracks, MP3, 225.1-268.6 kbps) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2005 - How Do You Do` -> `Cascada/How Do You Do CDM`.
- [x] 007: `Cascada` - `Fever` (13 tracks, MP3, 176.5-205.3 kbps) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2009 - Fever` -> `Cascada/Fever`.
- [x] 008: `Dark Tranquillity` - `Fiction (Expanded Edition - 2008) - Bonus DVD` (10 tracks, MP3, 135.9-212.2 kbps) from `etc/1-source-files/Dark Tranquility - Discography/2007 - Fiction (Expanded Edition - 2008)/Bonus DVD - Audio Rip` -> `Dark Tranquillity/Fiction (Expanded Edition - 2008) - Bonus DVD`.
- [x] 009: `Dark Tranquillity` - `Fiction (Expanded Edition - 2008)` (16 tracks, MP3, 320 kbps) from `etc/1-source-files/Dark Tranquility - Discography/2007 - Fiction (Expanded Edition - 2008)/CD` -> `Dark Tranquillity/Fiction (Expanded Edition - 2008)`.
- [x] 010: `Opeth` - `Orchid` (7 tracks, FLAC, 2448.1-3001 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(1995) Orchid` -> `Opeth/Orchid`.
- [x] 011: `Opeth` - `Morningrise` (5 tracks, FLAC, 2676.5-2925.8 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(1996) Morningrise` -> `Opeth/Morningrise`.
- [x] 012: `Opeth` - `My Arms, Your Hearse` (11 tracks, FLAC, 2415.4-3075 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(1998) My Arms, Your Hearse` -> `Opeth/My Arms, Your Hearse`.
- [x] 013: `Opeth` - `Still Life` (7 tracks, FLAC, 869.7-3059 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(1999) Still Life` -> `Opeth/Still Life`.
- [x] 014: `Opeth` - `Blackwater Park` (8 tracks, FLAC, 2478.3-3118.8 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(2001) Blackwater Park` -> `Opeth/Blackwater Park`.
- [x] 015: `Opeth` - `Deliverance` (6 tracks, FLAC, 2459.8-3115.2 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(2002) Deliverance` -> `Opeth/Deliverance`.
- [x] 016: `Opeth` - `Damnation` (8 tracks, FLAC, 2281.8-2985.4 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(2003) Damnation` -> `Opeth/Damnation`.
- [x] 017: `Opeth` - `Ghost Reveries` (8 tracks, FLAC, 2477.4-3091.8 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(2005) Ghost Reveries` -> `Opeth/Ghost Reveries`.
- [x] 018: `Opeth` - `Heritage` (10 tracks, FLAC, 2252.5-2866.7 kbps) from `etc/1-source-files/Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop/(2011) Heritage` -> `Opeth/Heritage`.
- [x] 019: `Sigur Rós` - `Valtari` (10 tracks, FLAC, 575.4-791.8 kbps) from `etc/1-source-files/Sigur Ros discography (FLAC)/1. Studio Albums/2012. Valtari` -> `Sigur Rós/Valtari`.
- [x] 020: `The Birthday Massacre` - `Imagica (Demo 1)` (7 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2000] Imagica (Demo 1)` -> `The Birthday Massacre/Imagica (Demo 1)`.
- [x] 021: `The Birthday Massacre` - `Imagica (Demo 2)` (6 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2001] Imagica (Demo 2)` -> `The Birthday Massacre/Imagica (Demo 2)`.
- [x] 022: `The Birthday Massacre` - `Nothing and Nowhere` (9 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2002] Nothing And Nowhere` -> `The Birthday Massacre/Nothing and Nowhere`.
- [x] 023: `The Birthday Massacre` - `Violet` (13 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2005] Violet` -> `The Birthday Massacre/Violet`.
- [x] 024: `The Birthday Massacre` - `Walking With Strangers` (12 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2007] Walking With Strangers` -> `The Birthday Massacre/Walking With Strangers`.
- [x] 025: `The Birthday Massacre` - `Looking Glass` (8 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2008] Looking Glass [EP]` -> `The Birthday Massacre/Looking Glass`.
- [x] 026: `The Birthday Massacre` - `Show And Tell` (16 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2009] Show And Tell (Live Album)` -> `The Birthday Massacre/Show And Tell`.
- [x] 027: `The Birthday Massacre` - `Pins And Needles` (11 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2010] Pins and Needles` -> `The Birthday Massacre/Pins And Needles`.
- [x] 028: `The Birthday Massacre` - `Imaginary Monsters` (8 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2011] Imaginary Monsters [EP]` -> `The Birthday Massacre/Imaginary Monsters`.
- [x] 029: `The Birthday Massacre` - `Hide And Seek` (10 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2012] Hide and Seek` -> `The Birthday Massacre/Hide And Seek`.
- [x] 030: `The Birthday Massacre` - `Superstition` (10 tracks, MP3, 320 kbps) from `etc/1-source-files/THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]/[2014] Superstition` -> `The Birthday Massacre/Superstition`.
- [x] 031: `The Prodigy` - `Always Outnumbered, Never Outgunned` (12 tracks, MP3, 224.9-263.7 kbps) from `etc/1-source-files/The Prodigy/Always Outnumbered, Never Outgunned` -> `The Prodigy/Always Outnumbered, Never Outgunned`.
- [x] 032: `The Prodigy` - `Music For The Voodoo Crew` (18 tracks, MP3, 192 kbps) from `etc/1-source-files/The Prodigy/Music For The Voodoo Crew` -> `The Prodigy/Music For The Voodoo Crew`.
- [x] 033: `X-Japan` - `1987.05.17 Skull Thrash Zone Commemoration GIG` (6 tracks, MP3, 256 kbps) from `etc/1-source-files/XJapan/1987.05.17 skull thrash zone commemoration gig` -> `X-Japan/1987.05.17 Skull Thrash Zone Commemoration GIG`.
- [x] 034: `X-Japan` - `WEEK END` (2 tracks, MP3, 207-213.4 kbps) from `etc/1-source-files/XJapan/1990.04.21 - X - WEEK END (VBR)` -> `X-Japan/WEEK END`.
- [x] 035: `X-Japan` - `Symphonic Blue Blood` (9 tracks, MP3, 128 kbps) from `etc/1-source-files/XJapan/1991.08.21 - X Japan & Tokyo Academic Chamber Orchestra - Symphonic Blue Blood (128)` -> `X-Japan/Symphonic Blue Blood`.
- [x] 036: `X-Japan` - `Symphonic Silent Jealousy` (8 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/1992.26.08 - X Japan & Tokyo Academic Chamber Orchestra - Symphonic Silent Jealousy (192)` -> `X-Japan/Symphonic Silent Jealousy`.
- [x] 037: `X-Japan` - `Art Of Life` (1 tracks, MP3, 320 kbps) from `etc/1-source-files/XJapan/[ALBUM] Art of Life` -> `X-Japan/Art Of Life`.
- [x] 038: `X-Japan` - `X - Japan - Ballad Collection` (10 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[ALBUM] Ballad Collection` -> `X-Japan/X - Japan - Ballad Collection`.
- [x] 039: `X-Japan` - `On Guitar` (10 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[ALBUM] On Guitar` -> `X-Japan/On Guitar`.
- [x] 040: `X-Japan` - `On Piano` (14 tracks, MP3, 128-192 kbps) from `etc/1-source-files/XJapan/[ALBUM] On Piano` -> `X-Japan/On Piano`.
- [x] 041: `X-Japan` - `On the Verge of Destruction Disc 1` (9 tracks, MP3, 112.3-139 kbps) from `etc/1-source-files/XJapan/[ALBUM] On the Verge of Destruction/Disc 1` -> `X-Japan/On the Verge of Destruction Disc 1`.
- [x] 042: `X-Japan` - `On the Verge of Destruction Disc 2` (8 tracks, MP3, 117.5-132.1 kbps) from `etc/1-source-files/XJapan/[ALBUM] On the Verge of Destruction/Disc 2` -> `X-Japan/On the Verge of Destruction Disc 2`.
- [x] 043: `X-Japan` - `STAR BOX` (12 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[ALBUM] Star Box` -> `X-Japan/STAR BOX`.
- [x] 044: `X-Japan` - `Trance X` (11 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[ALBUM] Trance X` -> `X-Japan/Trance X`.
- [x] 045: `X-Japan` - `DemoTape [I'LL KILL YOU]` (3 tracks, MP3, 128 kbps) from `etc/1-source-files/XJapan/[DEMO] I'LL KILL YOU` -> `X-Japan/DemoTape [I'LL KILL YOU]`.
- [x] 046: `X-Japan` - `Crucify my Love` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Crucify My Love` -> `X-Japan/Crucify my Love`.
- [x] 047: `X-Japan` - `DAHLIA` (2 tracks, MP3, 320 kbps) from `etc/1-source-files/XJapan/[SINGLE] DAHLIA` -> `X-Japan/DAHLIA`.
- [x] 048: `X-Japan` - `Endless Rain` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Endless Rain` -> `X-Japan/Endless Rain`.
- [x] 049: `X-Japan` - `Forever Love` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Forever Love` -> `X-Japan/Forever Love`.
- [x] 050: `X-Japan` - `EP [I'LL KILL YOU]` (2 tracks, MP3, 128 kbps) from `etc/1-source-files/XJapan/[SINGLE] I'LL KILL YOU  EP` -> `X-Japan/EP [I'LL KILL YOU]`.
- [x] 051: `X-Japan` - `Kurenai` (2 tracks, MP3, 320 kbps) from `etc/1-source-files/XJapan/[SINGLE] Kurenai` -> `X-Japan/Kurenai`.
- [x] 052: `X-Japan` - `Kurenai Sonic Sheet` (1 tracks, MP3, 128 kbps) from `etc/1-source-files/XJapan/[SINGLE] Kurenai Sonic Sheet` -> `X-Japan/Kurenai Sonic Sheet`.
- [x] 053: `X-Japan` - `Longing ~ Togireta Melody` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Longing ~ Togireta Melody` -> `X-Japan/Longing ~ Togireta Melody`.
- [x] 054: `X-Japan` - `Longing ~Setsubou No Yoru` (3 tracks, MP3, 160 kbps) from `etc/1-source-files/XJapan/[SINGLE] Longing ~setsubou no yoru` -> `X-Japan/Longing ~Setsubou No Yoru`.
- [x] 055: `X-Japan` - `Rusty Nail` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Rusty Nail` -> `X-Japan/Rusty Nail`.
- [x] 056: `X-Japan` - `Say Anything` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Say Anything` -> `X-Japan/Say Anything`.
- [x] 057: `X-Japan` - `Standing Sex` (2 tracks, MP3, 320 kbps) from `etc/1-source-files/XJapan/[SINGLE] Standing Sex` -> `X-Japan/Standing Sex`.
- [x] 058: `X-Japan` - `Tears [] Single []` (2 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/[SINGLE] Tears` -> `X-Japan/Tears [] Single []`.
- [x] 059: `X-Japan` - `Skull Thrash Zone vol1` (2 tracks, MP3, 160 kbps) from `etc/1-source-files/XJapan/Omnibus - Skull Thrash Zone vol. 1` -> `X-Japan/Skull Thrash Zone vol1`.
- [x] 060: `X-Japan` - `HeavyMetalForceIII` (2 tracks, MP3, 128 kbps) from `etc/1-source-files/XJapan/Omnibus LP 1985.11.xx Heavy Metal Force III` -> `X-Japan/HeavyMetalForceIII`.
- [x] 061: `X-Japan` - `Live in Hokkaido 1995-12-4 Bootleg` (12 tracks, MP3, 192 kbps) from `etc/1-source-files/XJapan/X Japan - Live in Hokkaido 1995.12.4 Bootleg` -> `X-Japan/Live in Hokkaido 1995-12-4 Bootleg`.
- [x] 062: `X-Japan` - `Live Live Live Tokyo Dome Disc 1` (9 tracks, MP3, 160 kbps) from `etc/1-source-files/XJapan/X-Japan - Live Live Live Tokyo Dome 1993-1996/Disc 1` -> `X-Japan/Live Live Live Tokyo Dome Disc 1`.
- [x] 063: `X-Japan` - `Live Live Live Tokyo Dome Disc 2` (10 tracks, MP3, 160 kbps) from `etc/1-source-files/XJapan/X-Japan - Live Live Live Tokyo Dome 1993-1996/Disc 2` -> `X-Japan/Live Live Live Tokyo Dome Disc 2`.

### 3.2 Blocked duplicate-destination candidates

- [x] D01: BLOCKED duplicate destination `Cascada/Cascada - Original Me (Includes Greatest Hits)` from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - 2011 - Original Me/Cascada - 2011 - Original Me/CD1`.
- [x] D02: BLOCKED duplicate destination `Cascada/Cascada - Original Me (Includes Greatest Hits)` from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - 2011 - Original Me/Cascada - 2011 - Original Me/CD2`.

## Phase 4 — Final reporting

### 4.1 Update report artifacts

- [x] Write `processing-runs/<run-id>/processing-summary.json` with processed, blocked, failed, and skipped counts.
- [x] Write `processing-runs/<run-id>/processing-summary.md` with links to per-candidate artifacts.
- [x] Update `album-organization-audit-2026-07-09.md` with a processing summary link.
- [x] Update `source-dir-summaries-json/index.json` with the processing run summary path.

## Phase 5 — Verification

### 5.1 Scope and artifact checks

- [x] Confirm every §3.1 candidate has execute success JSON or blocked JSON.
- [x] Confirm every §3.2 candidate has blocked JSON and no execute JSON.
- [x] Confirm `git --no-pager diff --stat src package.json package-lock.json` is empty.
- [x] Record final `find etc/3-organized-files -mindepth 2 -type d | wc -l` in the processing summary.
