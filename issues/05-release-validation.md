# 05: Release validation

**What to build:** A green, reproducible release check proving the game is ready to publish.

**Blocked by:** 01, 02, 03, 04.

**Status:** done

- [x] `pnpm check` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` succeeds.
- [x] Asset validation passes for 750 clips, 750 clues, 50 theme images and SFX.
- [x] Build-size check passes.
- [x] Full E2E passes on chromium and mobile-chromium.
- [x] Five-locale visual snapshots are refreshed.
- [x] A manual smoke test covers Italian levels 1, 5, 10, 20 and 50.

## Validation record (2026-11-14)

- `pnpm check` — 0 errors, 0 warnings.
- `pnpm test` — 15 files, 88 tests passed.
- `pnpm build` — static site written to `build/`.
- `node scripts/validate_assets.mjs` — `assets valid` (50 theme images, 750 word clues, 750 clips, 8 SFX, music loop).
- `node scripts/check_build_size.mjs` — 6.47 MB; 50 images, 750 word images, 750 word clips; budget OK.
- `pnpm exec playwright test tests/e2e --project=chromium --project=mobile-chromium` — 97 passed, 1 skipped (the real touch-drag test skips desktop chromium by design and passes on `mobile-chromium`).
- Visual snapshots refreshed with `--update-snapshots`, then 6 tests passed without it; all 20 app snapshots cover ro/it/en/de/ru.
- `pnpm lint` — Prettier clean. Formatted `issues/map.md`, `scripts/contact_sheet.mjs`, `scripts/word_glosses.json` and `scripts/word_translations.json`; `build_word_glosses.py` now writes tab-indented JSON so regeneration stays lint-clean.
- Manual Playwright smoke on Italian levels 1, 5, 10, 20 and 50 (levels 20 and 50 with a seeded save): each opened a bucket, showed the localized clue and audio control, solved a word, marked the bucket done and persisted the word; no console or page errors.
