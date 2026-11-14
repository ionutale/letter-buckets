---
title: Solved vs unsolved buckets must be obvious
type: feature
status: in_progress
created: 2026-11-14
---

## Goal

A child should see at a glance which word is solved and which is still to solve.

## Decision

The solved bucket becomes an **empty open bucket** with its word and a large green
check; unsolved buckets stay closed with the clue image and no word label.

## Work

- `Bucket.svelte`: done state hides the clue image, draws a gold check inside the
  bucket, adds a green check badge, strengthens the card outline and colours the word.
- Done buckets get a lid-pop + check-draw + label-rise.
- `Bucket.svelte.test.ts` covers the empty/checked done state and the clue-bearing
  closed state.
- E2E `level.spec.ts` covers solving the first word.

## Acceptance

- [ ] Solved card: no clue image, visible check badge, visible word.
- [ ] Unsolved cards: clue image, no check.
- [ ] Desktop and mobile E2E pass.
- [ ] Five-locale visual snapshots refreshed.
