# 08: Package 3 art and audio

**What to build:** The visual and spoken identity of Package 3: 50 level illustrations, 750 per-word clue images, and 750 word clips.

**Blocked by:** None (content and UI are in place).

**Status:** ready-for-agent

- [x] Extend the asset generators for Package 3 and write `/art/p3/…` and `/audio/p3/…`.
- [x] Generate 50 level illustrations at 768×432 WebP (reviewed via `python3 scripts/contact_sheet.py --package p3`).
- [x] Generate 750 localized word clues at 256×256 WebP (reviewed with `node scripts/contact_sheet.mjs --package p3 <locale>`).
- [x] Generate 750 slowed, regional word clips.
  - [x] Italian: 150 clips for each of the five narrators.
  - [x] English, German (Qwen), Romanian, Russian (Piper).
- [ ] Review all five Package 3 contact sheets and correct wrong or text-bearing images. (Clue sheets reviewed for en; level sheet reviewed.)
- [x] `validate_assets --packages` and `check_build_size` cover Package 3; build stays under budget.
- [ ] Package 3 works offline with all its assets precached.

## QA sweep, 2026-11-17

- Clue icons for Italian, German and Russian were reviewed by variance outlier
  (the 24 flattest of the 1,500). Two were wrong and were regenerated with
  explicit glosses: Russian `ЧЕШУЯ` (scales) drew a comb, `ВОДА` (water) drew a
  blank blob. The other 22 were legitimate minimal subjects.
- A transcription sweep over 2,250 default-narrator clips flagged 962, but the
  flags are dominated by the transcriber mishearing correct audio ("FLUTE" heard
  as "flu", "KATZE" as "cats"). Only 21 heard a different known word, mostly
  near-homophones. The method is recorded here as unsuitable as a gate for
  isolated 0.6 s words; duration checks and spot listening remain the guard.
