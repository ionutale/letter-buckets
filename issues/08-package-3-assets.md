# 08: Package 3 art and audio

**What to build:** The visual and spoken identity of Package 3: 50 level illustrations, 750 per-word clue images, and 750 word clips.

**Blocked by:** None (content and UI are in place).

**Status:** ready-for-agent

- [x] Extend the asset generators for Package 3 and write `/art/p3/…` and `/audio/p3/…`.
- [x] Generate 50 level illustrations at 768×432 WebP (reviewed via `python3 scripts/contact_sheet.py --package p3`).
- [x] Generate 750 localized word clues at 256×256 WebP (reviewed with `node scripts/contact_sheet.mjs --package p3 <locale>`).
- [ ] Generate 750 slowed, regional word clips.
  - [x] Italian: 150 clips generated with the native `narratrice-a` voice.
  - [ ] English, German (Qwen), Romanian, Russian (Piper).
- [ ] Review all five Package 3 contact sheets and correct wrong or text-bearing images. (Clue sheets reviewed for en; level sheet reviewed.)
- [ ] `validate_assets` and `check_build_size` cover Package 3; build stays under budget.
- [ ] Package 3 works offline with all its assets precached.
