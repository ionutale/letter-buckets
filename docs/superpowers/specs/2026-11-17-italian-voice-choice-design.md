# Italian voice choice — design

**Date:** 2026-11-17
**Status:** approved, implementing

## Intent

Italian currently has one narration voice (`narratrice-a`). The player should be
able to pick between five Italian voices in Settings, and every Italian word
clip in all three packages should exist for each voice.

## Goals

- Generate 150 Italian clips per voice per package: 4 alternates × 3 packages
  = 1,800 new clips, alongside the 450 existing `narratrice-a` clips.
- A voice picker in Settings, shown only when the language is Italian, with a
  preview button per voice.
- The choice applies to every Italian word in play, the Word Book and the level
  end card, in all three packages.
- The choice survives reloads and follows the shared settings, like mode and
  volume.
- Offline keeps working for the default voice without extra downloads.

## Non-goals

- No voice choice for English, German, Romanian or Russian in this change.
- No per-package voice choice; one Italian voice for all packages.
- No on-device synthesis; all clips stay pre-generated.

## Constraints

- The service worker precaches every file in `static/`. Preaching all five
  voices would take the install from ~12 MB to ~20 MB and re-download it on
  every deploy.
- `check_build_size.mjs` fails the build over 20 MB and asserts exact clip
  counts.
- Build is currently ~12 MB; 1,800 clips at ~4.5 KB add ~8 MB.

## Decisions

- **Precache the default, lazy-load alternates.** `narratrice-a` stays in the
  precache list; the four alternates are excluded from install precache and are
  cached on first play by the existing cache-first `/audio/` lane.
- **Default voice keeps today's paths.** `/audio/words/it/lNN-wN.mp3` and the
  package equivalents stay as they are, so no existing clip moves. Alternates
  get a voice segment: `/audio/words/it/<voice>/lNN-wN.mp3`,
  `/audio/p2/words/it/<voice>/…`, `/audio/p3/words/it/<voice>/…`.
- **App-level voice ids drop the locale prefix:** `narratrice`, `chiara`,
  `marco`, `lucia`, `giovane`, mapped to the studio ids `narratrice-a`,
  `it-maestra-chiara`, `it-narratore-marco`, `it-nonna-lucia`,
  `it-voce-giovane`. Voice labels are proper names, so they are not translated.
- **One setting, shared by all packages:** `settings.voice`, default
  `narratrice`, sanitized against the known ids on load.
- **Build budget rises to 24 MB**, and the size script asserts 2,250 Italian
  clips (450 default + 1,800 alternates).
- **Studio ids are exported** from the content export, so the generator and the
  app cannot drift.

## Left to the builder

- Exact picker layout in Settings: a labelled list of five rows, each with the
  voice name, a preview button that plays the first word of level 1, and a
  pressed state on the selected one.
- Whether the preview reuses the word-audio element or a dedicated one.
