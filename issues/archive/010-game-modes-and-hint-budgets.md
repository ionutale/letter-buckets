---
title: Three game modes with hint budgets
type: feature
status: open
created: 2026-11-14
---

## Goal

Add easy, medium and hard modes with different hint reserves.

## Decisions

- **Facile:** unlimited hints.
- **Medio:** 15 manual hints per chapter (10 levels).
- **Difficile:** 5 manual hints per chapter.
- “Categoria” means chapter, not theme or language.
- Automatic hints after 10 seconds are free; only presses of the hint button spend a
  hint. This preserves the gentle nudge without silently draining the reserve.
- One press = one hint action (not the whole three-step chain).

## Open design details

- Mode selection lives in settings/home and persists globally.
- Budget is per locale and per chapter; replaying levels does not refill it.
- Switching modes must not create free refills: store usage per mode or keep a single
  conservative counter.
- When the reserve is 0: disable the hint button, show “0”, keep automatic hints and
  normal play available.
- Show the remaining count near the hint button.

## Acceptance

- [ ] Mode picker and explanation in all five locales.
- [ ] Easy never decrements.
- [ ] Medium/hard decrement only on manual presses.
- [ ] Counter resets at the next chapter and persists across reloads.
- [ ] Unit tests for budget accounting and E2E for the disabled state.
