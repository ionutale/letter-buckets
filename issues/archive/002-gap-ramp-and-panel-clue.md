---
title: Gap ramp and clue in the word panel
type: feature
status: closed
created: 2026-11-13
closed: 2026-11-14
---

## Goal

Repeat a 1/2/3/4 missing-letter ramp in every ten-level chapter and keep the word
picture visible in the missing-letter view.

## Resolution

- `gapCountForLevel(level)` uses `((level - 1) % 10) + 1`: levels 1–4 → 1 gap,
  5–7 → 2, 8–9 → 3, 10 → 4. Repeated in all five chapters.
- Minimum word lengths are gaps + 2 (3, 4, 5, 6); maximum length is 8.
- Words below the minimum at levels 5–10 were replaced in all five locales.
- The per-word clue sits above the slots in `WordPanel.svelte`.
- Commit `1b9c405`.
