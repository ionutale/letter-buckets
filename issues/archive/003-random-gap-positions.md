---
title: Random stable gap positions
type: feature
status: closed
created: 2026-11-13
closed: 2026-11-14
---

## Goal

The missing letters are chosen at random, not always the final letter, but a word
keeps the same layout on replay.

## Resolution

- `chooseGaps` shuffles all positions with a seed from locale/level/word index/word.
- Distinct slots; exact gap count; no final-letter shortcut.
- Unit tests cover stability, variation and the full ramp.
