---
title: Clue-image QA for all 750 words
type: task
status: in_progress
created: 2026-11-14
---

## Goal

Every clue image must show the word unambiguously, with no text and no wrong object.

## Method

- `scripts/contact_sheet.mjs <locale>` builds a 10-column review sheet in `/tmp`.
- Review each locale, note wrong/ambiguous cells, add an override in
  `scripts/build_word_glosses.py`, rebuild `scripts/word_glosses.json`, delete the
  affected WebP and rerun `scripts/generate_word_art.py --all`.
- Priorities: no embedded text, plural words show multiples, people words show people,
  abstract words use a concrete visual.

## Known fixes

Italian latte, seme, moneta, cura, binario, stazione, freddo, notte, stelle, albore,
quadro, regina; analogous fixes in EN/RO/DE/RU. See 005.

## Acceptance

- [ ] All five locale sheets reviewed after the last regeneration.
- [ ] No image contains letters/text (soap, shop, etc.).
- [ ] No carriages for platform/station, no fruit blobs for plural fruit.
- [ ] Final regenerated images committed.
