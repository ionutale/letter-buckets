# 07: Package 2 art and audio

**What to build:** The visual and spoken identity of Package 2: 50 level illustrations, 750 per-word clue images, and 750 word clips, matching Package 1's art direction and audio style.

**Blocked by:** None (content and UI are in place).

**Status:** ready-for-agent

- [x] Extend the asset generators to read Package 2 and write `/art/p2/…` and `/audio/p2/…`.
- [x] Generate 50 level illustrations at 768×432 WebP (reviewed via `python3 scripts/contact_sheet.py --package p2`).
- [x] Generate 750 localized word clues at 256×256 WebP (reviewed with `node scripts/contact_sheet.mjs --package p2 <locale>`).
- [x] Generate 750 slowed, regional word clips.
  - [x] Italian: 150 clips for each of the five narrators.
  - [x] English, German (Qwen), Romanian, Russian (Piper).
- [ ] Review all five Package 2 contact sheets and fix wrong or text-bearing images. (Clue sheets reviewed for en; level sheet reviewed.)
- [x] `validate_assets --packages` and `check_build_size` cover Package 2; build stays under budget.
- [ ] Package 2 works offline with all its assets precached.

## Notes

Package 2 has 50 independent levels per locale and five chapters. Its content and UI are already live behind the “complete Package 1” gate.

`scripts/generate_audio.mjs --package p2 --locale it` writes the Italian clips;
`node scripts/validate_assets.mjs --packages` checks every package.
