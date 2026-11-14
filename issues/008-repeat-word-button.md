---
title: Repeat-word button while solving
type: feature
status: in_progress
created: 2026-11-14
---

## Goal

A clearly labelled repeat-audio control is available while the child is solving a word.

## Work

- `WordPanel.svelte` adds a pill button with a speaker icon and `m.hear_word()` under
  the clue image, above the letter slots.
- The existing header speaker remains for quick access.
- The button replays the current word through `audio.playWord`.

## Acceptance

- [ ] The button is visible during the puzzle and after completion.
- [ ] It plays the current word.
- [ ] Accessible name and 44px target.
- [ ] E2E/visual coverage.
