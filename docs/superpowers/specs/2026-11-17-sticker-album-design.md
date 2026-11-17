# Sticker album and mastery badges — design

**Date:** 2026-11-17
**Status:** awaiting approval
**Related:** `2026-11-12-letter-buckets-design.md`, issues `07`, `08`

## Intent

The game already rewards progress in three ways: chapter stars on the home screen,
the Word Book, and package unlocks. None of them is something a child *collects*.

This adds two collections that suit ages 4–8 and stay calm:

- **A sticker album.** Every cleared level leaves one sticker behind. Fifty Levels
  become five chapter spreads of ten, each with a large chapter sticker.
- **Mastery badges.** Four per chapter, showing how a child worked rather than what
  they finished: clean words, no hint presses, both, and the chapter itself.

Nothing is timed, scored, ranked, or lost. The album is a keepsake, not a
leaderboard, and a badge that is earned stays earned even if the child replays the
chapter badly.

## Who it is for

A four-year-old who cannot read and navigates by picture and position, and a parent
who occasionally looks at progress. The album must be usable without reading a
single word: the sticker grid, the number in an empty slot, and the size and colour
of a chapter sticker carry the meaning.

## Goals

- A fourth shelf item on the home screen opens the album for the active package.
- One sticker per cleared level, fifty per package, in five spreads of ten.
- A chapter sticker in the spread header, gold when the chapter is complete.
- Four badges per chapter, evaluated once when the chapter is finished and stored:
  - **Chapter sticker** — all ten levels of the chapter cleared.
  - **All first try** — every word in the chapter completed with no wrong letter.
  - **No hints** — the chapter finished without pressing the hint button.
  - **Never needed help** — no wrong letters *and* no hint presses.
- Tapping a filled sticker reopens that level.
- A finished level announces its sticker on the existing level-complete card, and a
  finished chapter announces any badges earned in that same moment.
- Works in all five locales and offline, with no text required to understand it.

## Non-goals

- No stickers per word; stickers are per level only.
- No album shared across packages. Each package has its own five spreads, mirroring
  its own save.
- No new audio. The album is silent apart from the sticker's own level being played
  when tapped.
- No sharing, printing, exporting, or photos of the album.
- No badge notifications outside the level-complete card, and no badge counters,
  streaks, or "almost there" prompts.
- No achievement for spending time, playing daily, or keeping a streak.

## Anti-goals

These count as failures even if the screens work:

- A badge that disappears, downgrades, or is revoked by a later replay.
- A nudge toward an unfinished slot: no "3 missing", no progress bar per spread, no
  grey locked padlock on a badge.
- Replaying a level costing anything. Replay is free and changes no collection.
- Making hint use feel like a mistake. The hint button is help; the badge is a
  quiet observation, never a score.

## Constraints found in the code

- `LocaleProgress` is sanitized field by field in `save.ts`. New fields must be
  optional with defaults and validated the same way.
- `clearedThrough` is monotonic and never decreases; `levelWords` is reset on
  replay, while `unlocked` is permanent. Stickers can therefore be derived from
  `clearedThrough` with no stored field.
- `hintUsage` is keyed `${mode}:${chapter}` and is **never written in Easy mode** —
  `spendHint` returns before recording. A "no hints" badge read from it would be
  handed to every Easy player for free.
- `metrics.chapters[n]` aggregates every attempt, including replays. A badge
  recomputed on load would silently lose its condition after a bad replay.
- The service worker precaches everything in `static/`. Fifty stickers per package
  add weight: 150 files at 256×256 WebP must stay under ~20 KB each to keep the
  build under the 20 MB budget enforced by `check_build_size.mjs`.
- Packages 2 and 3 have no art or audio yet (issues `07`, `08`). Their albums must
  render as empty spreads, never as broken images.
- `save.ts` currently has uncommitted Italian voice-choice work in the working tree.
  Gamification adds fields to the same file; build on top of that work, never revert
  it.

## Approaches considered

**A — Stickers derived, badges frozen (chosen).** A sticker exists exactly when
`level <= clearedThrough`, so no sticker data is stored. Badges are evaluated once,
when a chapter's tenth level completes, and written into a small set of ids. The
save grows by a few hundred bytes, replays cannot revoke anything, and the album
screen is a pure view of state the game already keeps.

**B — Store everything.** Stickers and badges both persisted with timestamps. This
buys "new!" markers and a dated album, at the cost of fifty entries per package, two
more write paths that can half-fail, and a migration for existing saves. Rejected:
nothing in the product needs the date, and the calm tone does not want a "new"
badge chasing attention.

**C — Derive badges too.** No new fields at all; badges recomputed on load from
`metrics.chapters`. Rejected: aggregate metrics include replays, so a child who
earned "all first try" and later replays sloppily would watch the badge vanish.

## Design

### Data

Two additions to `LocaleProgress` in `src/lib/storage/save.ts`:

```ts
/** Earned mastery badges, ids like `c3:firsttry`. */
badges: string[];
/** Hint-button presses per chapter, across all modes. Keyed "1"…"5". */
helpUsed: Record<number, number>;
```

- `badges` defaults to `[]`; sanitized by regex `/^c[1-5]:(star|firsttry|nohints|helpfree)$/`,
  de-duplicated, and sorted by chapter then a fixed badge order.
- `helpUsed` defaults to `{}`; keys clamped to 1–5, values to non-negative integers.
- Neither field is required by older saves; both are filled by `defaultLocaleProgress`.
- `resetLocale` (settings reset) clears both with the rest of the locale progress.
- Stickers are **not** stored. `stickerLevels(progress)` returns every level from 1 to
  `clearedThrough`, and the album derives its spreads from that.

Recording help: `spendHint` already exists for Medium and Hard. Add a single
`recordHelp(data, locale, level)` called whenever the hint button produces an action,
**and** in the Easy path so the press is counted even though the budget is unlimited.
The existing `hintUsage` budget behaviour is unchanged; `helpUsed` is a parallel
counter, not a replacement.

### Badge evaluation

Called at the end of `markLevelComplete` once a chapter boundary is reached
(`level % 10 === 0`), using the chapter's own metrics at that moment:

| id           | condition                                                          |
| ------------ | ------------------------------------------------------------------ |
| `c<n>:star`  | chapter cleared (the chapter stamp is being awarded now)            |
| `c<n>:firsttry` | `wordsCompleted >= 30 && wordsWithMistakes === 0`               |
| `c<n>:nohints`   | `helpUsed[n] === 0`                                             |
| `c<n>:helpfree`  | `firsttry` and `nohints` both true                              |

`markLevelComplete` takes the chapter metric totals it already has access to. Because
this runs only when the tenth level completes, later replays cannot change the
outcome, and a badge is never written twice.

Badges are **not** evaluated for chapters finished before this feature ships: there
is no history of hint presses or clean words to reconstruct, and inventing one would
be a lie. Existing players begin with the chapter stickers only.

### Album screen

New route `src/routes/album/+page.svelte`, reached from a fourth item in the home
shelf.

- Header: back button, title "Sticker album", package chip for the active package.
  If the active package is locked its album is read-only with a lock on the chip,
  matching the package selector's behaviour.
- One spread per chapter, ten stickers in a 5×2 grid, paged with dots. The current
  chapter opens first: the chapter containing `clearedThrough + 1`, or chapter 5 when
  everything is finished.
- A filled sticker is the level's sticker art inside a paper die-cut frame, rotated a
  degree or two like a real sticker. It is a button that navigates to that level.
- An empty slot is a quiet dashed die-cut outline with the level number in the middle.
  Not a button, no padlock, no "missing" language.
- The chapter sticker sits in the spread header: gold when the chapter is complete,
  blank die-cut paper before that.
- The four badges sit in a row under the grid, always all four present: earned ones
  in gold, leaf, berry and ink with their name; unearned ones muted with "not yet".
  No locks, no percentages.
- Page paging uses horizontal scroll-snap rather than a JS carousel, so it works
  without script and respects reduced motion.

### Home shelf

The shelf becomes four columns. Labels shorten to Levels / Words / Album / Progress.
The album item carries "12 of 50" as its caption. Below 360 px the captions are
hidden so four items still fit; the icons and labels remain.

### Level complete card

`LevelComplete.svelte` gains the sticker for the level just finished, shown above the
word list, entering with the existing overshoot easing. When the level ends a chapter,
newly earned badges appear as one line each under the sticker. Nothing animates on
screen for more than the current card already does.

The card needs the sticker path and the newly earned badges passed in, because the
session does not know about art. The level page computes both after saving.

### Sticker art

A dedicated set, one per level, per package:

- `static/art/stickers/lNN.webp` for Package 1, `/art/p2/stickers/lNN.webp` and
  `/art/p3/stickers/lNN.webp` for the others.
- 256×256 WebP, under 20 KB, centred single subject on the same warm cream ground as
  the level art, generated with the existing FLUX pipeline in `scripts/generate_art.py`.
- No transparency. The die-cut shape — white edge, soft shadow, slight rotation — is
  drawn in CSS, so every image stays a plain square and generation stays reliable.
- A new `scripts/generate_stickers.py` reuses the model loader and `STYLE_TAIL`, adds a
  `sticker` prompt suffix ("single object, centred, plain cream background, no text"),
  and writes a contact sheet for review through `scripts/contact_sheet.py`.
- A missing or broken image falls back to the empty-slot treatment, never a broken
  icon. Packages 2 and 3 ship with empty spreads until issues `07` and `08` land.

### Localization

New keys in all five `messages/*.json`:

`album`, `album_progress` ("{done} of {total} stickers"), `sticker_locked` (screen-reader
label for an empty slot), `badge_star`, `badge_firsttry`, `badge_nohints`,
`badge_helpfree`, `badge_earned`, `badge_not_yet`, `chapter_spread` ("Chapter {n}"),
`sticker_new`, `badges_new`.

Tone: statements, not instructions. "Not yet" rather than "Locked". No exclamation
marks.

### Accessibility

- Stickers and empty slots are list items; filled ones are buttons with an accessible
  name of theme plus level number.
- Touch targets at least 44 px; the grid uses `gap` rather than padding to keep them.
- The active page dot carries `aria-current`.
- The album is fully keyboard reachable; scroll-snap containers get `tabindex="0"`.
- Colour is never the only signal: earned badges carry a word, empty slots carry a
  number.

### Testing

- Unit: each badge condition; badges survive a replay with mistakes; sanitizer drops
  malformed ids; `helpUsed` counts in Easy; older saves without the fields load with
  defaults; `resetLocale` clears badges and help.
- Unit: `stickerLevels` at 0, 1, 9, 10, 50.
- E2E: shelf item opens the album; a cleared level shows its sticker while a later
  one shows a number; the chapter sticker turns gold at level 10; earning a badge
  shows it on the level-complete card and keeps it after a sloppy replay; a locked
  package shows a locked album; Packages 2 and 3 render empty spreads without broken
  images.
- Visual: album with 8 of 10 stickers in the first spread, in all five locales.

## Rollout

Package 1 stickers are generated in this change. Packages 2 and 3 albums ship empty
and fill when their art lands. No deploy is part of this work; `pnpm deploy:cf`
stays manual.

## Left to the builder

- Exact badge icon shapes and the paper texture of the die-cut frame.
- Whether the spread pages as a swipe or as chapter tabs, and how the dots feel on a
  small phone.
- Microcopy in each locale, within the tone above.
- The sticker prompt list per level, derived from `scripts/themes.json`.
- Whether the level-complete sticker needs its own modest sound.

## Calls made here (not decided by the user)

1. Badges live inside the album, per spread, not on the Progress screen.
2. Tapping a sticker reopens its level rather than showing a detail sheet.
3. Stickers are square images masked in CSS, not transparent die-cut PNGs.
4. Automatic help from the idle timer does **not** count toward the no-hint badge;
   only deliberate presses do, so pausing to think is never punished.
5. The album follows the active package; a locked package shows a locked album.
6. Unearned badges are visible but muted, because all four are always still reachable
   by replaying the chapter.
