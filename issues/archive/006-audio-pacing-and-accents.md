---
title: Slow speech and regional voice styles
type: feature
status: in_progress
created: 2026-11-14
---

## Goal

The spoken word is too fast for a young child; regenerate every clip slower and with a
deliberate regional style.

## Decision

- Qwen (EN/IT/DE): instruction now says “Speak slowly and clearly in <language> with
  an accent, warm and unhurried, for a young child”.
- Accents: English → soft Southern English; Italian → gentle Tuscan; German → gentle
  Bavarian; Russian → soft Moscow; Romanian → gentle Transylvanian.
- Piper (RO/RU): the voice model is native and fixed; `--length_scale 1.2` slows it.
  Piper cannot follow an accent prompt, so the accent is documentary for these two.
- `seconds` rises to 4 (maximum, not speed).

## Acceptance

- [ ] All 750 clips regenerated with the new settings.
- [ ] Duration range checked; raise the validator maximum if needed.
- [ ] No clipped endings.
- [ ] `scripts/generate_audio.mjs` documents the per-locale style.
