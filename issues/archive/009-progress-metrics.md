---
title: Progress metrics — correct and incorrect writing
type: feature
status: open
created: 2026-11-14
---

## Goal

Show how many words were written correctly and how many were not, plus the underlying
letter attempts.

## Decisions

- Count both **words** and **attempts**.
- A word is “first try” when it is completed with no wrong placement attempt.
- A word is “with mistakes” when it is completed after at least one wrong attempt.
- Track correct placements and wrong placements separately.
- Break totals down per locale and per chapter (10 levels); show overall accuracy.
- New **Progressi** view reachable from the home screen.

## Open design details

- Save schema: additive fields on `LocaleProgress` under a `metrics` object, or a
  separate storage key. Prefer additive and sanitised so old saves survive.
- Do not count the same completed word twice when replaying it; count first completion
  for word totals and all attempts for attempt totals.
- No charts required; a compact card grid is enough for v1.

## Acceptance

- [ ] Metrics persist locally and survive reload/corrupt-save recovery.
- [ ] Per-locale and per-chapter breakdown.
- [ ] Values match the session outcomes in unit and E2E tests.
- [ ] Progressi view is localized in all five languages.
