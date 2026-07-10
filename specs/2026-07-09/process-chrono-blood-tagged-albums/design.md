# Design: process Chrono Symphonic and Blood on the Asphalt

## Inputs

- Chrono FLAC CD1: `etc/1-source-files/Chrono Symphonic/Chrono Symphonic (flac version)/CD1`
- Chrono FLAC CD2: `etc/1-source-files/Chrono Symphonic/Chrono Symphonic (flac version)/CD2`
- Blood source: `etc/1-source-files/Blood on the Asphalt - Super Street Fighter 2 Turbo`
- Analysis artifacts: `reports/album-organization-audit/2026-07-09-new-source-files-audit/chrono-blood-spec-analysis-20260709-193925/`

## Staging model

The processing run creates audio-only staging folders, fixed-tag staging folders, dry-run artifacts, execute artifacts, and artwork copy records under a dated report processing-run folder. Source files are copied into staging and never modified in place.

## Chrono Symphonic

Both FLAC disc folders are combined before `fix-tags` runs. This is required because `--reset-track` assigns track numbers by alphabetical filename within each effective album. Running the command per disc would restart numbering at 1 for each disc and cause duplicate destination filenames. The fixed staging output should organize 25 tracks into `OverClocked ReMix/Chrono Symphonic`.

## Blood on the Asphalt

Blood uses `--album-strategy originalalbum` because the current album tag is `http://sf2.ocremix.org - Blood on the Ashpalt`, while `originalalbum` is `Super Street Fighter 2 Turbo`. This creates a corrected destination album folder while leaving the previous typo/URL destination untouched.

## Artwork

Chrono has shared package artwork; Blood has no likely image artwork in the current source package. Copy any selected artwork only after organize execution succeeds.
