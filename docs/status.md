# Letter Buckets — status and handover

Last updated: 2026-11-17. Live at <https://letter-buckets.pages.dev>.

## What the game is

A calm word game for four- to eight-year-olds. Each level has three words, each
word sits in a bucket behind a clue image, and the child fills 1–4 missing
letters by dragging tiles. Five languages (Romanian, Italian, English, German,
Russian), three modes, per-language progress, no accounts and no network calls
at runtime.

## Where it stands

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| Packages            | 3 separate worlds (q1–q3), 50 levels each                       |
| Words               | 450 per language, 2,250 word entries across five languages      |
| Level illustrations | 150 (50 per package)                                            |
| Word clue images    | 2,250 (750 per package, 150 per language)                       |
| Word clips          | 4,050 (1,350 per package; Package 1 has five Italian narrators) |
| Italian narrators   | narratrice, chiara, marco, lucia, giovane                       |
| Tests               | 114 unit, 119 E2E (desktop + mobile), 6 visual, axe clean       |
| Build size          | 27.12 MB total                                                  |
| First install       | 1.00 MB precache (shell, fonts, icons, UI sounds, music)        |
| Package download    | ~1.6 MB per package for one language and narrator               |

Packages 2 and 3 unlock in order: complete all 50 levels of a package to open
the next one. Progress, stars, hint budgets and analytics are stored separately
per package and per language.

## Architecture

```
src/lib/content      word lists per locale and package, themes, voice catalogue
src/lib/storage      save schema, sanitisation, unlock rules, hint budgets
src/lib/game         puzzle state, session runes, hints, metrics
src/lib/audio        playback controller, Web Audio gain graph, word paths
src/lib/pwa          service worker policy, registration, progressive downloads
src/routes           home, level map, level, word book, progress, settings
src/service-worker   versioned cache, shell navigation, cache-first assets
scripts              content export, glosses, art and audio generation, manifests
tests/               unit, E2E and visual specs
issues/              tickets, including issues/review for the 2026-11-17 review
```

## How assets are produced

1. `pnpm content:export` writes `scripts/content.json`, `content.p2.json`,
   `content.p3.json`, `themes*.json` and `voices.json` from the TypeScript
   content.
2. `scripts/build_word_glosses.py` writes `scripts/word_glosses.json`: one
   image subject per word, bilingual for non-English locales, with hand-written
   overrides for abstract or ambiguous words.
3. `scripts/generate_art.py --package pN --all` renders level illustrations.
4. `scripts/generate_word_art.py --package pN --all` renders clue icons from the
   glosses.
5. `scripts/generate_audio.mjs --all --package pN [--locale xx] [--voice id]`
   renders clips: Qwen3-TTS for English, German and Italian (Italian uses
   designed native voices), Piper for Romanian and Russian. `PIPER_BIN` must
   point at `.venv-piper/bin/piper`.
6. `scripts/build_manifest.mjs` (run by `prebuild`) writes one manifest per
   package, language and narrator into `static/manifests/`, ordered per level.
7. `node scripts/validate_assets.mjs --packages` and `pnpm size` verify the
   result.

## Progressive downloads

The install carries the shell only. Level art, clues and clips download in
level order, starting at the player's current level, then packages 2 and 3 when
they unlock. A slim fixed bar reports progress and never blocks play. Downloads
are written by the page into the versioned cache the service worker reads, so a
finished queue is the offline copy. Offline therefore covers the language and
narrator actually in use, not all five languages.

## Work completed on 2026-11-17

- **Package 3** added end to end: 50 levels, 150 words per language, chained
  unlock, independent save, selector, chapter tabs, Word Book and analytics.
- **Italian narrators**: four new designed voices plus `narratrice-a`, 450 clips
  each for 1,800 alternates, a picker in Settings with previews, alternate
  voices left out of the install precache.
- **Level illustrations** for packages 2 and 3 (`2d59745`): 100 scenes with
  reviewed contacts sheets.
- **Clue icons** for packages 2 and 3 (`0538f2e`): 1,500 icons, 90 gloss
  overrides, 11 renders corrected after review.
- **Package audio** (`89fd659`): 1,200 clips in English, German, Romanian and
  Russian.
- **Progressive downloads** (`5d10d37`, `12179bb`): manifests, ordered queue,
  progress bar, service worker precache reduced to the shell, and the shell
  served from cache on hosts that redirect `200.html`.
- **Speaker icon** (`634d7ae`): replaced the 🔊 emoji in word chips and the
  level-complete replay buttons with a drawn icon.

## Audio bugs found and fixed

Three separate defects produced the same symptom — a word or the music losing
its beginning, or the volume sliders doing nothing.

1. **Routing into a suspended graph** (`32de5ad`). Word clips were routed into
   the Web Audio graph before the context finished resuming, discarding the
   first chunk — the opening consonant. Clips now play natively until the
   context reports `running`.
2. **Volume sliders could not reach music** (`7fa8edb`). Volume was applied
   directly only when no graph existed, so music started before the context was
   running never received slider changes. Routing is now tracked per element
   and music is relinked whenever the context starts.
3. **Music at double attenuation** (`5752997`). Music created unrouted carries
   `volume = 0.16`; routing it later added the channel gain `0.16` on top, so it
   played at −32 dB and the slider appeared dead. The element now hands its
   level to the graph.
4. **Unbuffered elements reintroduced the clipped letter** (`7b2820e`).
   `preloadLevel()` built buffered elements that `playWord()` never used. Words
   are now played from the preloaded element and re-warmed after playback.

## Code review, 2026-11-17

Four review passes wrote **45 findings** as individual tickets in
`issues/review/`, prefixed by area:

| Prefix | Area                              | Count   | Highest severity                                               |
| ------ | --------------------------------- | ------- | -------------------------------------------------------------- |
| `A`    | audio, PWA, service worker, build | 10      | `A01` music double attenuation — fixed                         |
| `B`    | storage, game, content            | pending | —                                                              |
| `C`    | routes, components, i18n, a11y    | 21      | `C01` Package 3 settings silently reverted                     |
| `D`    | scripts, tests, docs              | 14      | `D02` audio written in place, truncated clips never regenerate |

Each ticket carries severity, location with line numbers, confidence, the
failure mode, quoted evidence, a concrete fix and how to test it.

Fixed from the review so far: `A01` (music double attenuation), `C01`/`B01`
(settings lost while a later package is active) and `D01` (manifests in the
install precache). The storage reviewer also simulated all 2,250 puzzles across
three packages and five locales and found no unsolvable puzzle, wrong gap count
or broken unlock chain.

## Next, in priority order

1. **`D02` — audio written in place.** A killed render leaves a truncated clip
   that every later run skips. Write to a temporary file and rename on success;
   apply the same to `generate_word_art.py`.
2. **`A04` — download retry never gives up.** A permanent failure keeps
   retrying every 15 s for the life of the page.
3. **Review the remaining clue sheets.** Only English and Romanian were
   inspected; Italian, German and Russian icons deserve the same look.
4. **English and German narrators.** Both still use `serena`, the preset that
   carried a foreign accent in Italian.
5. **iPhone mute verification.** The code pauses music and suspends the context;
   never confirmed on a real device.
6. **Transcription sweep.** Duration checks caught three gibberish German
   clips; a Whisper pass over all 4,050 would catch short ones.
7. **Documentation drift** (`D11`–`D13`): README inventory, the service-worker
   claim in the download spec, and the manifest ordering description.

## Commands

```bash
pnpm dev                 # local dev
pnpm check               # svelte-check
pnpm test                # unit tests
pnpm test:e2e            # Playwright, desktop and mobile
pnpm test:visual         # snapshot tests
pnpm build               # exports content, writes manifests, builds
pnpm size                # build budget and asset counts
pnpm deploy:cf           # build and deploy to Cloudflare Pages
node scripts/validate_assets.mjs --packages
```

## Constraints worth remembering

- Everything is static; there is no server and no runtime model call.
- The audio and art pipelines need a local GPU and a shared studio process, and
  retry on `409 BUSY`.
- Each deploy opens a new cache, so download flags are keyed by build version.
- The build budget is 30 MB; the size gate also asserts exact asset counts.
