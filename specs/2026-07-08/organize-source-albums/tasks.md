# Tasks: Organize Source Albums

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
> - **No `npx`** in any form. Use `npm run <script>` or `node build/dist/index.js`.
> - **Only the albums listed in §3.1 are in scope.** Albums not listed below are out of scope.
> - **Do not run `fix-tags`** for this spec.
> - Treat `etc/1-source-files/**` as read-only input.
> - Mark the matching `- [x]` checkbox immediately when each task is finished.

## Phase 1 — Pre-flight

### 1.1 Build CLI and prepare audit workspace

- [x] Run `npm run build` and require exit 0.
- [x] Create an audit workspace for final dry-run JSON, execute JSON, artwork-copy logs, blocked logs, and the final Markdown report.

## Phase 2 — Validate clean scope

### 2.1 Confirm in-scope album artifacts

- [x] Confirm every §3.1 album has a saved successful `summarize-source-dir --format json` artifact.
- [x] Confirm every §3.1 album has a saved successful `organize-files --format json` dry-run artifact.
- [x] Confirm no unlisted albums are queued for execution.

## Phase 3 — In-scope album checklist

### 3.1 Albums allowed for this pass

- [x] Treat this checklist as exhaustive; any album not listed here is out of scope.
- [x] 001: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (21 tracks, FLAC, 712-957 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 3`.
- [x] 002: `Linkin Park` - `Hybrid Theory` (20 tracks, FLAC, 379-1057 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 003: `Linkin Park` - `Hybrid Theory` (18 tracks, FLAC, 1429-1760 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 5`.
- [x] 004: `The Velvet Underground` - `Peel Slowly And See 1965-1969` (18 tracks, FLAC, 377-900 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1995) The Velvet Underground - Peel Slowly And See 1965-1969 [16Bit-44.1kHz]/Disc 4`.
- [x] 005: `Daft Punk` - `Homework` (16 tracks, FLAC, 812-1048 kbps, artwork: no) from `etc/1-source-files/Daft Punk - Discography [FLAC Songs] [PMEDIA] ⭐️/(1997) Daft Punk - Homework  (25th Anniversary Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 006: `The Velvet Underground` - `Gold` (16 tracks, FLAC, 801-937 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2005) The Velvet Underground - Gold [16Bit-44.1kHz]/Disc 2`.
- [x] 007: `The Velvet Underground` - `The Velvet Underground & Nico (45th Anniversary - Deluxe Edition)` (16 tracks, FLAC, 655-859 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1966) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary - Deluxe Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 008: `The Velvet Underground` - `The Velvet Underground & Nico` (16 tracks, FLAC, 655-858 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 009: `The Velvet Underground` - `Peel Slowly And See 1965-1969` (16 tracks, FLAC, 366-887 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1995) The Velvet Underground - Peel Slowly And See 1965-1969 [16Bit-44.1kHz]/Disc 3`.
- [x] 010: `Bran Van 3000` - `The Garden` (15 tracks, FLAC, 745-1028 kbps, artwork: no) from `etc/1-source-files/Bran Van 3000 - Garden -FLAC`.
- [x] 011: `Daft Punk` - `Homework` (15 tracks, FLAC, 597-1002 kbps, artwork: no) from `etc/1-source-files/Daft Punk - Discography [FLAC Songs] [PMEDIA] ⭐️/(1997) Daft Punk - Homework  (25th Anniversary Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 012: `The Velvet Underground` - `Peel Slowly And See 1965-1969` (15 tracks, FLAC, 480-882 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1995) The Velvet Underground - Peel Slowly And See 1965-1969 [16Bit-44.1kHz]/Disc 2`.
- [x] 013: `The Velvet Underground` - `The Velvet Underground & Nico (45th Anniversary - Deluxe Edition)` (15 tracks, FLAC, 417-914 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1966) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary - Deluxe Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 014: `The Velvet Underground` - `The Velvet Underground & Nico` (15 tracks, FLAC, 416-914 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 4`.
- [x] 015: `Aphex Twin` - `Disc 1 - Drukqs` (15 tracks, FLAC, 353-984 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/2001 - Drukqs/Disc 1`.
- [x] 016: `Aphex Twin` - `Disc 2 - Drukqs` (15 tracks, FLAC, 313-919 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/2001 - Drukqs/Disc 2`.
- [x] 017: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (15 tracks, FLAC, 426-498 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 4`.
- [x] 018: `The Velvet Underground` - `The Velvet Underground & Nico` (15 tracks, FLAC, 413-481 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 019: `The Velvet Underground` - `The Velvet Underground` (14 tracks, FLAC, 2579-3078 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1969) The Velvet Underground - The Velvet Underground (45th Anniversary  Super Deluxe) [24Bit-96kHz]/Disc 4`.
- [x] 020: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (14 tracks, FLAC, 783-951 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 021: `The Velvet Underground` - `Gold` (14 tracks, FLAC, 684-877 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2005) The Velvet Underground - Gold [16Bit-44.1kHz]/Disc 1`.
- [x] 022: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (14 tracks, FLAC, 469-526 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 023: `System Of A Down` - `System Of A Down` (13 tracks, FLAC, 885-1070 kbps, artwork: no) from `etc/1-source-files/System Of A Down - Discography [FLAC Songs] [PMEDIA] ⭐️/(1998) System Of A Down - System Of A Down [16Bit-44.1kHz]/Disc 1`.
- [x] 024: `Utada Hikaru` - `Utada Hikaru Single Collection Vol.2` (13 tracks, FLAC, 780-1065 kbps, artwork: no) from `etc/1-source-files/Utada Hikaru - Discography [FLAC Songs] [PMEDIA] ⭐️/(2010) - Utada Hikaru - Utada Hikaru Single Collection Vol.2 [16Bit-44.1kHz]/Disc 1`.
- [x] 025: `The Velvet Underground` - `White Light / White Heat (Deluxe Edition)` (13 tracks, FLAC, 761-931 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - White Light  White Heat (Deluxe Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 026: `The Velvet Underground` - `White Light / White Heat` (13 tracks, FLAC, 761-931 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - White Light  White Heat (Super Deluxe) [16Bit-44.1kHz]/Disc 1`.
- [x] 027: `Aphex Twin` - `Disc 2 - 26 Mixes For Cash (Compilation)` (13 tracks, FLAC, 645-1046 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/2003 - 26 Mixes For Cash (Compilation)/Disc 2`.
- [x] 028: `Aphex Twin` - `Disc 1 - 26 Mixes For Cash (Compilation)` (13 tracks, FLAC, 618-877 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/2003 - 26 Mixes For Cash (Compilation)/Disc 1`.
- [x] 029: `The Velvet Underground` - `The Velvet Underground` (12 tracks, FLAC, 2802-3158 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1969) The Velvet Underground - The Velvet Underground (45th Anniversary  Deluxe Edition) [24Bit-96kHz]/Disc 2`.
- [x] 030: `The Velvet Underground` - `The Velvet Underground` (12 tracks, FLAC, 1604-1726 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1969) The Velvet Underground - The Velvet Underground (45th Anniversary  Super Deluxe) [24Bit-96kHz]/Disc 3`.
- [x] 031: `Linkin Park` - `Hybrid Theory` (12 tracks, FLAC, 1519-1753 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 6`.
- [x] 032: `Linkin Park` - `Hybrid Theory` (12 tracks, FLAC, 936-1106 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 4`.
- [x] 033: `Linkin Park` - `Hybrid Theory` (12 tracks, FLAC, 818-1104 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 1`.
- [x] 034: `The Velvet Underground` - `Live MCMXCIII` (12 tracks, FLAC, 744-1003 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1993) The Velvet Underground - Live MCMXCIII [16Bit-44.1kHz]/Disc 2`.
- [x] 035: `The Velvet Underground` - `The Complete Matrix Tapes - Recorded November 26 & 27, 1969` (12 tracks, FLAC, 639-838 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2015) The Velvet Underground - The Complete Matrix Tapes - Recorded November 26 & 27, 1969 [16Bit-44.1kHz]/Disc 4`.
- [x] 036: `The Velvet Underground` - `The Complete Matrix Tapes - Recorded November 26 & 27, 1969` (12 tracks, FLAC, 660-912 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2015) The Velvet Underground - The Complete Matrix Tapes - Recorded November 26 & 27, 1969 [16Bit-44.1kHz]/Disc 2`.
- [x] 037: `The Velvet Underground` - `The Complete Matrix Tapes - Recorded November 26 & 27, 1969` (12 tracks, FLAC, 653-828 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2015) The Velvet Underground - The Complete Matrix Tapes - Recorded November 26 & 27, 1969 [16Bit-44.1kHz]/Disc 1`.
- [x] 038: `Aphex Twin` - `Disc 2 - Selected Ambient Works Volume II` (12 tracks, FLAC, 436-649 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/1994 - Selected Ambient Works Volume II (2 discs)/Disc 2`.
- [x] 039: `Aphex Twin` - `Disc 1 - Selected Ambient Works Volume II` (12 tracks, FLAC, 394-643 kbps, artwork: no) from `etc/1-source-files/Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]/1994 - Selected Ambient Works Volume II (2 discs)/Disc 1`.
- [x] 040: `The Velvet Underground` - `The Velvet Underground` (11 tracks, FLAC, 2990-3131 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1969) The Velvet Underground - The Velvet Underground (45th Anniversary  Super Deluxe) [24Bit-96kHz]/Disc 2`.
- [x] 041: `The Velvet Underground` - `Live MCMXCIII` (11 tracks, FLAC, 818-950 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1993) The Velvet Underground - Live MCMXCIII [16Bit-44.1kHz]/Disc 1`.
- [x] 042: `The Velvet Underground` - `The Bootleg Series Vol.1 - The Quine Tapes` (11 tracks, FLAC, 512-596 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2001) The Velvet Underground - The Bootleg Series Vol.1 - The Quine Tapes (Live) [16Bit-44.1kHz]/Disc 1`.
- [x] 043: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (11 tracks, FLAC, 421-669 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 5`.
- [x] 044: `The Velvet Underground` - `Loaded (Re-Loaded 45th Anniversary Edition)` (10 tracks, FLAC, 745-903 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1970) The Velvet Underground - Loaded (Re-Loaded 45th Anniversary Edition) [16Bit-44.1kHz]/Disc 7`.
- [x] 045: `The Velvet Underground` - `The Velvet Underground & Nico` (10 tracks, FLAC, 662-767 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 3`.
- [x] 046: `The Velvet Underground` - `White Light / White Heat` (10 tracks, FLAC, 332-452 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - White Light  White Heat (Super Deluxe) [16Bit-44.1kHz]/Disc 2`.
- [x] 047: `The Velvet Underground` - `White Light / White Heat (Deluxe Edition)` (7 tracks, FLAC, 684-753 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - White Light  White Heat (Deluxe Edition) [16Bit-44.1kHz]/Disc 2`.
- [x] 048: `The Velvet Underground` - `White Light / White Heat` (7 tracks, FLAC, 684-753 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - White Light  White Heat (Super Deluxe) [16Bit-44.1kHz]/Disc 3`.
- [x] 049: `The Velvet Underground` - `The Bootleg Series Vol.1 - The Quine Tapes` (7 tracks, FLAC, 515-587 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2001) The Velvet Underground - The Bootleg Series Vol.1 - The Quine Tapes (Live) [16Bit-44.1kHz]/Disc 3`.
- [x] 050: `The Velvet Underground` - `The Velvet Underground` (6 tracks, FLAC, 2778-3135 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1969) The Velvet Underground - The Velvet Underground (45th Anniversary  Super Deluxe) [24Bit-96kHz]/Disc 6`.
- [x] 051: `Linkin Park` - `Hybrid Theory` (6 tracks, FLAC, 1389-1632 kbps, artwork: no) from `etc/1-source-files/Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️/(2000) Linkin Park - Hybrid Theory  (20th Anniversary Edition) [16Bit-44.1kHz]/Disc 3`.
- [x] 052: `The Velvet Underground` - `The Complete Matrix Tapes - Recorded November 26 & 27, 1969` (6 tracks, FLAC, 692-862 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2015) The Velvet Underground - The Complete Matrix Tapes - Recorded November 26 & 27, 1969 [16Bit-44.1kHz]/Disc 3`.
- [x] 053: `The Velvet Underground` - `Peel Slowly And See 1965-1969` (6 tracks, FLAC, 295-400 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1995) The Velvet Underground - Peel Slowly And See 1965-1969 [16Bit-44.1kHz]/Disc 1`.
- [x] 054: `Utada Hikaru` - `Utada Hikaru Single Collection Vol.2` (5 tracks, FLAC, 732-1010 kbps, artwork: no) from `etc/1-source-files/Utada Hikaru - Discography [FLAC Songs] [PMEDIA] ⭐️/(2010) - Utada Hikaru - Utada Hikaru Single Collection Vol.2 [16Bit-44.1kHz]/Disc 2`.
- [x] 055: `The Velvet Underground` - `The Bootleg Series Vol.1 - The Quine Tapes` (5 tracks, FLAC, 530-563 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(2001) The Velvet Underground - The Bootleg Series Vol.1 - The Quine Tapes (Live) [16Bit-44.1kHz]/Disc 2`.
- [x] 056: `The Velvet Underground` - `The Velvet Underground & Nico` (5 tracks, FLAC, 450-475 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 5`.
- [x] 057: `System Of A Down` - `System Of A Down` (4 tracks, FLAC, 894-1001 kbps, artwork: no) from `etc/1-source-files/System Of A Down - Discography [FLAC Songs] [PMEDIA] ⭐️/(1998) System Of A Down - System Of A Down [16Bit-44.1kHz]/Disc 2`.
- [x] 058: `The Velvet Underground` - `The Velvet Underground & Nico` (4 tracks, FLAC, 403-462 kbps, artwork: no) from `etc/1-source-files/The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️/(1967) The Velvet Underground - The Velvet Underground & Nico (45th Anniversary  Super Deluxe Edition) [16Bit-44.1kHz]/Disc 6`.
- [x] 059: `Sigur Rós` - `Ekki Múkk` (2 tracks, FLAC, 608-641 kbps, artwork: no) from `etc/1-source-files/Sigur Ros discography (FLAC)/7. Singles/2009. Ekki Múkk`.
- [x] 060: `Cascada` - `Everytime We Touch (The Album)` (14 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - 2006 - Everytime We Touch/Cascada - 2006 - Everytime We Touch`.
- [x] 061: `Billy Talent` - `Dead Silence` (14 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2012) Dead Silence`.
- [x] 062: `Cascada` - `Perfect Day` (13 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - 2007 - Perfect Day/Cascada - 2007 - Perfect Day`.
- [x] 063: `Billy Talent` - `Billy Talent II` (13 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2006) Billy Talent II`.
- [x] 064: `Billy Talent` - `Afraid of Heights` (13 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2016) Afraid of Heights`.
- [x] 065: `Cascada` - `Evacuate The Dancefloor (Maxi-Single)` (12 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - 2009 - Evacuate The Dancefloor/Cascada - 2009 - Evacuate The Dancefloor`.
- [x] 066: `Billy Talent` - `Billy Talent` (12 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2003) Billy Talent`.
- [x] 067: `Angels & Airwaves` - `Love (Instrumentals)` (11 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Angels & Airwaves/2010 - Love/Instrumental`.
- [x] 068: `Billy Talent` - `Billy Talent III` (11 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2009) Billy Talent III`.
- [x] 069: `Cascada` - `Evacuate The Dancefloor` (11 tracks, MP3, 233-320 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2009 - Evacuate The Dancefloor`.
- [x] 070: `Angels & Airwaves` - `Love Part Two (Instrumentals)` (11 tracks, MP3, 192-192 kbps, artwork: no) from `etc/1-source-files/Angels & Airwaves/2011 - Love Part Two/(Instrumental)`.
- [x] 071: `BT` - `Movement in Still Life` (11 tracks, MP3, 160-192 kbps, artwork: no) from `etc/1-source-files/BT Complete Discography (US Versions)/1999 - Movement in Still Life`.
- [x] 072: `Billy Talent` - `Crisis of Faith` (10 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Billy Talent Studio Discography (2003-2022) [MP3 320kbps]/(2022) Crisis of Faith`.
- [x] 073: `Cascada` - `Cascada Faded` (10 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2008 - Faded`.
- [x] 074: `Brian Transeau` - `ESCM` (10 tracks, MP3, 192-192 kbps, artwork: no) from `etc/1-source-files/BT Complete Discography (US Versions)/ESCM`.
- [x] 075: `My Dying Bride` - `The Light at the End of the World` (9 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1999] - The Light at the End of the World (320k)`.
- [x] 076: `My Dying Bride` - `Like Gods of the Sun` (9 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1996] - Like Gods of the Sun (320k)`.
- [x] 077: `My Dying Bride` - `For Lies I Sire` (9 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[2009] - For Lies I Sire (320k)`.
- [x] 078: `My Dying Bride` - `A Line of Deathless Kings` (9 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[2006] - A Line of Deathless Kings (320k)`.
- [x] 079: `My Dying Bride` - `The Dreadful Hours` (8 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[2001] - The Dreadful Hours (320k)`.
- [x] 080: `My Dying Bride` - `Songs of Darkness, Words of Light` (8 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[2004] - Songs of Darkness, Words of Light (320k)`.
- [x] 081: `Cascada` - `What Do You Want from Me CDM` (8 tracks, MP3, 182-208 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2007 - What Do You Want From Me`.
- [x] 082: `My Dying Bride` - `Turn Loose the Swans` (7 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1993] - Turn Loose the Swans (320k)`.
- [x] 083: `My Dying Bride` - `34.788%... Complete` (7 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1998] - 34.788%... Complete (320k)`.
- [x] 084: `My Dying Bride` - `As the Flower Withers` (7 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1992] - As the Flower Withers (320k)`.
- [x] 085: `My Dying Bride` - `The Angel and the Dark River` (7 tracks, MP3, 320-320 kbps, artwork: no) from `etc/1-source-files/My Dying Bride/[1995] - The Angel and the Dark River (320k)`.
- [x] 086: `Cascada` - `Miracle` (5 tracks, MP3, 189-226 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2004 - Miracle`.
- [x] 087: `Cascada` - `A Neverending Dream` (3 tracks, MP3, 228-248 kbps, artwork: no) from `etc/1-source-files/Cascada - Discography 2004-2011 Dez16v ( TLS Release )/Cascada - Singles (2004-2010)/Cascada - Singles (2004-2010)/2006 - A Neverending Dream`.

## Phase 4 — Execute listed albums only

### 4.1 Final dry-run and execute

- [x] For each checked §3.1 album, re-run `organize-files --format json` without `--execute` against its listed processing directory.
- [x] If the final dry-run fails, mark that album blocked and do not repair it in this pass.
- [x] If the final dry-run succeeds, run the same `organize-files` command with `--execute` and save execute JSON.

### 4.2 Copy artwork

- [x] For each executed album, copy associated artwork from the listed source directory into the final organized album directory.
- [x] Preserve original artwork filenames.
- [x] Block on same-name different-content artwork conflicts instead of overwriting.

## Phase 5 — Verification and report

### 5.1 Verify organized output

- [x] Run `summarize-source-dir --format json` against each final organized album folder.
- [x] Confirm expected track counts and formats for every executed listed album.
- [x] Confirm no unlisted album was copied.

### 5.2 Generate final Markdown report

- [x] Create `album-organization-report.md` in the audit workspace.
- [x] Include totals for organized albums, tracks, formats, artwork present/missing, blocked albums, and skipped out-of-scope albums.
- [x] Include a table with final album path, albumartist, album, track count, format, bitrate summary, artwork-present status, and artwork filenames.

### 5.3 Scope verification

- [x] Run `git --no-pager diff --stat src package.json package-lock.json` and require no output.
- [x] Run `find etc/3-organized-files -type f | sort` and inspect final organized paths.
