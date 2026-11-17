# Package downloads and progress — design

**Date:** 2026-11-17
**Status:** implemented
**Revision:** progressive Package 1, per the second round of answers.

## Intent

A first install should carry only what is needed to start playing. Everything
else — level art, word clues, word clips, and whole packages — downloads in the
background, in level order, with a progress bar that never blocks play.

## Goals

- First install is the shell plus UI sounds only: about **0.8 MB**.
- Level 1's assets follow immediately (~29 KB), so the player can start at once.
- While the player is on level 1, levels 2, 3, 4… download in order.
- Packages 2 and 3 are not downloaded at all until they unlock, then queue up
  the same way for the active language and narrator.
- One slim bar pinned to the top reports whatever is downloading. It never
  moves the layout and never blocks a tap.
- Opening anything before its download finishes still works: assets stream in
  through the existing cache-first lane.

## Non-goals

- No blocking modal or "download to continue" gate.
- No downloading of languages or narrators the player is not using.
- No change to how a word or clue behaves when its file is absent.

## Constraints

- Each deploy opens a new cache and drops the old one, so progress and
  download flags must be tied to the build version.
- The app has no server: every download is a plain `fetch` against static files,
  cached by the service worker's cache-first lane on the way through.
- Downloads go through the page into the versioned `Cache`, which works whether
  or not the service worker controls the page, so no `serviceWorker.ready` gate
  is needed.

## Decisions

- **The install precache shrinks to the shell**: `immutable` assets, icons,
  manifest, `200.html`, UI sounds and the music loop. All `/art/` and
  `/audio/words/` (including packages 2 and 3) leave it.
- **One downloader for everything.** Level assets and package assets are the
  same kind of job, ordered per level: level art, then each clue followed by its
  own clip.
- **Order is current level first**, then forward to 50, then any earlier gaps.
  A returning player on level 20 resumes at 20 instead of starting at 1.
- **Scope is package + locale + voice**: about 1.4–1.5 MB for all of Package 1
  in one language and narrator, about 1.6 MB per additional package today.
- **A generated manifest per package, locale and voice**
  (`/manifests/p2/it/narratrice.json`) lists the files that exist with their
  byte sizes, already ordered per level. Generated at build time; each manifest
  has an expected file count, so missing art fails the build instead of silently
  shortening the list.
- **Trigger:** the layout starts the queue on mount, and re-checks after a level
  is completed. Packages 2 and 3 join the queue when they unlock.
- **The queue writes into `letter-buckets-${version}` through the `Cache` API,
  so a file is kept whether or not the worker controls the page**, and starts as
  soon as the layer makes its first manifest request.
- **Download flags are keyed by build version**, so a deploy re-downloads only
  what it must.
- **The bar is `position: fixed`** at the top: a thin line and a short label.
  Absent when there is nothing to download.
- **Failures stay quiet.** Offline or a failed fetch pauses the queue and
  retries on the next visit; the game keeps streaming what it needs.

## My calls

- Switching language or narrator starts a fresh queue for that pair, rather
  than pre-downloading the other four languages. It is the same rule as
  packages, and keeps the promise of a minimal download.
- The offline guarantee becomes: everything in the language and narrator you
  actually use, once the bar has finished. Previously it was every language.

## Left to the builder

- Exact wording and look of the bar label in five languages.
- Concurrency of the queue (three at a time is the starting point).
- Whether a finished queue shows a short confirmation, or just disappears.
