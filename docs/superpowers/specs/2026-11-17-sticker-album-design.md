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
- Four badges per chapter, derived from per-level marks the game records as they happen:
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

**A — Stickers derived, mastery frozen (chosen).** A sticker exists exactly when
`level <= clearedThrough`, so no sticker data is stored. Mastery is recorded as two
monotonic per-level marks — clean run, no-hint run — and the four chapter badges are
derived from them. The save grows by two short arrays, replays cannot revoke anything,
the album screen is a pure view of state the game already keeps, and one messy level
can be repaired by replaying that level alone.

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
/** Levels finished with every word on the first try. */
cleanLevels: number[];
/** Levels finished without pressing the hint button. */
noHelpLevels: number[];
```

- Both default to `[]`, are de-duplicated, and are sanitized to integers in 1–50.
  Older saves simply load with empty arrays.
- `resetLocale` (settings reset) clears both with the rest of the locale progress.
- **Nothing else is stored.** Stickers are derived from `clearedThrough`; the four
  chapter badges are derived from the two arrays plus `chapterStamps`. That is safe
  because the arrays are monotonic: a level is added once and never removed, so a
  badge cannot be recomputed into a worse state.
- A level already in between `1` and `clearedThrough` may or may not be marked. That
  is honest: an unmarked level means "we never saw a clean run", not "it failed".

```ts
export function stickerLevels(progress: LocaleProgress): number[] {
	return Array.from({ length: progress.clearedThrough }, (_, i) => i + 1);
}
```

### What earns a mark

Marks are written by the level page when a level completes, from facts the session
observes during that level only:

- `cleanLevels` gets the level when all three words report into `onWordComplete` with
  `firstTry === true`.
- `noHelpLevels` gets the level when the hint button produced no action during the
  entire level, in any mode. `spendHint` currently returns before recording in Easy,
  so the level page tracks presses for this purpose separately, through the existing
  `onHintUsed` callback — no change to the Medium/Hard hint budget.

Two corrections the reviewer flagged, both applied here:

- **The first-try signal is unreliable today.** `mistakesThisWord` is reset by
  `closeWord` as well as `openBucket`, so closing a word after a wrong letter and
  reopening it reports the word as first try. The flag must live per word for the
  life of the session, cleared only by `openBucket` for a word that has not been
  completed yet.
- **Automatic idle hints do not create a mark failure.** The idle timer calls `place`
  directly, so it never reaches `onHintUsed`. Only a deliberate button press does,
  which is the intended meaning: the badge records that the child did not ask for
  help, not that they never paused.

### Badge evaluation

Derived, not stored. All four are pure functions of the progress record:

| badge | condition |
| --- | --- |
| **Chapter sticker** | `chapterStamps` includes the chapter (unchanged behaviour) |
| **All first try** | all ten levels of the chapter are in `cleanLevels` |
| **No hints** | all ten levels of the chapter are in `noHelpLevels` |
| **Never needed help** | the previous two both hold |

`newlyEarnedBadges(before, after, chapter)` compares the derived set for one chapter
before and after a save, which is what the level-complete card needs. Nothing is
written except the level arrays.

Consequences, all intended:

- A chapter with a shaky level 3 can still earn "all first try" by replaying level 3
  cleanly. One level, not ten.
- A chapter finished before this feature ships shows only its chapter sticker until
  the child replays some levels. There is no invented history and no epoch marker.
- Marks are added on replay, never removed, so a sloppy later replay cannot take a
  badge away — the anti-goal holds by construction rather than by freezing ids.

### Album screen

New route `src/routes/album/+page.svelte`, reached from a fourth item in the home
shelf.

- Header: back button, title "Sticker album", package chip naming the active package.
  The album always follows `resolveActivePackage`, exactly like the level map and the
  Word Book, so there is no locked-album state: a package that cannot be activated
  cannot be opened here either.
- One spread per chapter, ten stickers in a 5×2 grid, paged with dots. The current
  chapter opens first: the chapter containing `clearedThrough + 1`, or chapter 5 when
  everything is finished.
- A filled sticker is the level's sticker art inside a paper die-cut frame, rotated a
  degree or two like a real sticker. It is a button that navigates to that level. A
  cleared level opens in its finished state, exactly as it does today, with the big
  Play button that starts a fresh run — so repairing a missing mark costs one tap and
  no new replay mode exists.
- An empty slot is a quiet dashed die-cut outline with the level number in the middle.
  Not a button, no padlock, no "missing" language.
- The chapter sticker sits in the spread header: gold when the chapter is complete,
  blank die-cut paper before that. Its emblem is the chapter glyph the game already
  uses in `ChapterTabs.svelte`, drawn inline inside the sticker frame — no new art,
  and it works for Packages 2 and 3 whose assets do not exist yet.
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
word list, entering with the existing overshoot easing. Any badge that became complete
in that moment appears as one line each under the sticker — including a badge finished
by replaying a single level in the middle of a chapter. Nothing animates on
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

- Unit: each badge condition, including that a chapter missing one marked level earns
  nothing and that marking that level completes the badge.
- Unit: marks are added on replay and never removed; a sloppy replay after earning
  leaves the badge intact.
- Unit: sanitizer drops malformed level arrays, de-duplicates and clamps to 1–50;
  saves without the fields load with empty arrays; `resetLocale` clears both.
- Unit: `stickerLevels` at 0, 1, 9, 10, 50.
- Unit: a wrong letter followed by close-and-reopen no longer reports first try.
- Unit: a hint press in Easy mode prevents `noHelpLevels` while leaving the unlimited
  hint budget untouched.
- E2E: the shelf item opens the album; a cleared level shows its sticker while a later
  one shows a number; the chapter sticker turns gold at level 10; a badge earned after
  replaying one level appears on the level-complete card and survives a sloppy replay;
  Packages 2 and 3 render empty spreads without broken images.
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
5. The album follows the active package. There is no locked-album screen, because a
   package that is locked cannot be activated in the first place.
6. Unearned badges are visible but muted, because the per-level marks make all four
   reachable at any time by replaying the specific level that is missing.
7. The chapter sticker reuses the existing `ChapterTabs` emblem rather than five new
   images, which keeps the art set at exactly 150 stickers.
8. Replay repairs a missing mark but never removes one. A chapter can therefore earn
   "all first try" from a mix of runs, which is the kindest reading of the badge and
   the only one that keeps the anti-goal intact.
