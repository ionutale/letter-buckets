# Letter Buckets — Design

Status: approved 2026-11-12. Working title: **Letter Buckets**.

## 1. Intent

A calm, offline word game for children aged **4–8**, in **Romanian, Italian, English, German, and Russian**.

A level is a place with **three buckets**. Each bucket hides one word. The child taps a bucket, and the word appears as a row of letter tiles: some letters are already in place, the missing ones are empty slots. A tray below holds the missing letter tiles, shuffled. The child drags a tile into a slot — or taps a tile and then a slot — until the word is complete. Completing a word opens its bucket and adds the word to a growing **Word Book**. Completing all three buckets finishes the level and unlocks the next one.

There are **50 levels**, grouped into five chapters of ten. Every level has a theme (pets, breakfast, the garden, space), and one illustration sets the scene. There is no timer, no score, no losing, and no advertising.

The game is a standalone installable PWA. All art and audio are generated once with the local studios, committed with the game, and served offline. Nothing is generated at runtime and nothing leaves the device.

## 2. Why

- Children this age are learning letter shapes, letter sounds, and the idea that letters make words. Filling gaps in a known word is a small, satisfying win.
- The spoken word carries the meaning; the letters carry the puzzle. A pre-reader can play by sound and shape, and a 7–8-year-old gets real spelling practice.
- Five languages mean the game can be played by the child in the language they are actually learning, not a translation bolted on afterward.
- The bucket is a strong, physical "unlock" metaphor: closed, opened, filled. It gives the level a beginning, middle, and end without a fail state.

## 3. Audience and success

- **Primary player:** 4–8 years old, alone or with an adult nearby.
- **Session length:** 2–4 minutes for a level; 10–15 minutes for a chapter.
- **Success looks like:** a child who cannot read yet completes the first levels by matching letters and listening to the word; an older child finishes a chapter and can read every word in the Word Book; a parent can hand over a phone on a car ride and know it works offline, has no ads, and stores nothing remotely.
- **Accessibility success:** every action is possible without dragging, every letter and control is at least 44×44 px, and the game is usable with a keyboard and a screen reader.

## 4. Goals

1. 50 playable levels per locale, each with three words and a theme illustration.
2. A word puzzle that is understandable without reading instructions.
3. Drag-and-drop plus a tap-only path, both first-class.
4. Five complete locales, including Cyrillic and Romanian diacritics, with per-locale progress.
5. A Word Book that keeps every completed word and can speak it again.
6. Installable, fully offline PWA with all 750 word clips and 50 illustrations cached.
7. Gentle feedback: hints arrive before frustration, wrong letters never punish.

## 5. Non-goals

- Accounts, cloud sync, leaderboards, analytics, or any runtime data/API call. The only network request is the browser fetching an updated app shell.
- Multiple child profiles. One local profile; multi-kid profiles are a later addition.
- Handwriting, typing, or free spelling. The puzzle is always fill-in-the-gap.
- Per-word illustrations. The level illustration sets the scene; the spoken word gives the clue.
- Languages beyond the five in this version.
- Timers, stars, scores, lives, or a fail state.
- A level editor or remote CMS. Content is typed and committed.

## 6. Anti-goals

- A screen so busy that a 4-year-old cannot tell what to tap.
- A hint that gives the answer immediately and removes the puzzle.
- A wrong answer that buzzes, shakes hard, or costs something.
- Text-heavy instructions. The game must be playable from icons, animation, and audio.
- Generated art that looks like 50 different artists made it.
- A translation that keeps English word lengths and makes Romanian or Russian unplayable.
- Audio that only works online, or voices that switch quality mid-sentence.

## 7. Constraints

- **Stack:** SvelteKit 3, Svelte 5 runes, TypeScript, Vite, pnpm, `@sveltejs/adapter-static` with `fallback: '200.html'`, `ssr = false`, `prerender = false`. Static SPA, no server code.
- **i18n:** Paraglide.js with `ro`, `it`, `en`, `de`, `ru`. Device language wins; English fallback. URL-prefixed locales for shareable links.
- **Fonts:** Nunito via Fontsource, with `latin-ext` (Romanian `ă â î ș ț`, German `ä ö ü`) and `cyrillic` subsets. No CDN.
- **Art:** 50 FLUX.2-klein illustrations, generated locally, reviewed for consistency, shipped as WebP.
- **Audio:** Qwen3-TTS for English, Italian, German, Russian; Piper `ro_RO` for Romanian. Stable Audio 3 / procedural effects for SFX and one music loop. Shipped as MP3.
- **Storage:** `localStorage`, versioned and sanitised on load. No cookies beyond the Paraglide locale cookie.
- **Runtime:** no model calls, no network, no external assets.
- **Build size:** target under 20 MB precached (≈750 word clips + 50 images + app shell + fonts).
- **All-ages safety:** no external links inside the child-facing UI; grown-up settings behind a small "for grown-ups" treatment.

## 8. Approaches considered

### 8.1 Play layout

- **A — all three words visible with one shared tray.** Strongest "three waiting words" feel, but a 390×844 phone shows three words with 6–7 gaps at once, and the tray competes with the words for space.
- **B — one bucket at a time, three indicators above.** Calmest, but loses the three-bucket object and stretches the level.
- **C — three buckets on the level screen, tap one to open its word (chosen).** The level screen keeps the three-bucket promise and is the calmest on a phone. The opened word gets the whole screen, so tiles can be large. Each word gets its own tray, so the puzzle is focused.

Chosen: **C**. The level screen is the "three buckets" screen; the word panel is the "one word" screen. After a word is completed, its bucket visibly unlocks and the child returns to the other two.

### 8.2 Architecture

- **SvelteKit 3 static SPA with a pure puzzle engine and typed content (chosen).** Matches the workspace conventions, gives routes for the level map and word book, supports the built-in service worker, and keeps the puzzle logic testable without a browser.
- **Plain Vite + Svelte SPA.** Fewer moving parts, but loses the routing, static adapter, and PWA patterns already proven in this workspace.
- **Canvas/Phaser game engine.** Wrong tool: the game is a small set of large, accessible buttons and drop targets. Canvas would make screen-reader support and text scaling much harder for no benefit.

### 8.3 Content

- **50 themed levels, words curated per language (chosen).** Themes keep the illustrations meaningful and the vocabulary coherent. Word length and letters differ per language, which is correct for the child; the difficulty dial is the number of gaps and decoys, not translation length.
- **One English list translated five ways.** Cheaper to author, but produces unnatural vocabulary and impossible letter lengths in Romanian and Russian.
- **Random word lists per level.** No theme, no illustration, no sense of place; rejected.

### 8.4 Audio

- **Pre-generated local assets (chosen).** Consistent voice, zero runtime latency, works offline.
- **Device speech synthesis at runtime.** Zero assets, but voice quality and Romanian/Russian availability vary by device; rejected.
- **Human recording all 750 words.** Best quality, but a separate recording project per language; deferred.

## 9. The game

### 9.1 Level screen

- Header: back to chapter, "Level {n}" and the localized theme name, sound toggle.
- One 16:9 illustration banner for the level theme, with `alt=""` (decorative) and the theme name as adjacent text.
- Three bucket cards in a row. Each card shows its bucket SVG, a number 1–3, and a state:
  - **closed:** lid on, ribbon, word hidden;
  - **open/current:** the child has opened it at least once but not completed it;
  - **done:** lid off, a star or flag, and the completed word shown under the bucket.
- Progress text: "{done} of 3 words".
- Tap a bucket to open the word panel. Any order.
- A completed bucket can be reopened to see the word and hear it again.
- A "Play again" action on a completed level resets the three word puzzles for that level only. It never removes words from the Word Book.
- On a first run, two coach marks: one on bucket 1, one inside the word panel on a tile and its slot. Dismissed forever after.

### 9.2 Word panel

- Opens over the level screen as a full-screen panel with a strong entry animation (respecting reduced motion).
- Header: back to buckets, "Word {i} of 3", speaker button to replay the word.
- The word is **spoken automatically once** shortly after opening, unless muted.
- Word row: one large tile per letter. Revealed letters are solid, readable tiles. Missing letters are empty, dashed, rounded slots — never ghost letters.
- Tray: one tile per missing letter, plus 0–2 decoys depending on the level band. Tiles are shuffled deterministically per level/word so replaying is familiar.
- Drag a tile onto a slot: correct snaps in, wrong bounces back. Tap a tile to select it, then tap a slot: same result. Both paths are always available.
- If a wrong tile belongs to a different empty slot in the same word, that slot pulses gently after the bounce, so the child is guided without being told.
- A correct placement locks the slot. No undo is needed.
- When every slot is filled, the word is complete: the full word is spoken, a warm chime plays, sparkles appear, and the panel shows a "Back to buckets" action. The panel does not auto-close; the child can admire the word and hear it again.
- Backing out mid-word keeps nothing for that word; completed words in the level remain completed.

### 9.3 Difficulty curve

The dial is the number of gaps and decoys, not the length of the word. Word length is 3–6 letters and varies naturally by language.

| Levels | Gaps per word | Decoys | Intent                                                            |
| ------ | ------------- | ------ | ----------------------------------------------------------------- |
| 1–10   | 1             | 0      | One missing letter; usually the final letter. Learn the tap/drag. |
| 11–20  | 1             | 0      | One gap anywhere; longer, less familiar words.                    |
| 21–30  | 2             | 0      | Two gaps; hold two letters in mind.                               |
| 31–40  | 2             | 1      | One lookalike distractor.                                         |
| 41–50  | 2–3           | 2      | Three gaps on longer words; two distractors.                      |

Validation constraints:

- At least one letter is revealed, always.
- A 3-letter word has at most 1 gap; a 4-letter word at most 2; 5–6 letters at most 3.
- Gaps never include the same slot twice.
- Decoy letters are visually confusable with a letter in the word and are **not** present in the word. Confusable sets are per script/locale (e.g. `B/D`, `P/Q`, `M/N`, `Ș/S`, `Ä/A`, `Ш/Щ`).
- The tray contains exactly one tile per gap, so repeated letters get repeated tiles.

The gap placement algorithm is deterministic from the level id and word index, and is left to the builder within these constraints. The first levels prefer the final letter; later levels can open the first letter and interior letters.

### 9.4 Hints

- Idle for 10 s → the first empty slot pulses.
- Another 10 s → the matching tray tile pulses.
- Another 10 s → the tile is placed automatically.
- Auto-place is capped at **one letter per interaction**: after the automatic placement the hint chain stops until the child taps, drags, or presses a key again. A tablet left open cannot finish a word on its own.
- All hint timers pause while the document is hidden and resume on visibility.
- The hint button (a lightbulb) triggers the next step immediately. It is always visible.
- Any placement resets the idle timer.
- Hints are unlimited and free: no penalty, no score change, no "you used a hint" record.
- An auto-placed letter is a real placement. If the child returns and finishes the word, it saves normally.

### 9.5 Level complete

- Triggered when the third word is completed and the child returns to the bucket row.
- Overlay: confetti (or a gentle sparkle under reduced motion), "Level complete", the three words with speaker buttons, "Next level" and "Back to levels".
- At the end of a chapter (levels 10, 20, 30, 40, 50), a chapter stamp is added to a small collection strip.
- At level 50, a final celebration and a shortcut to the Word Book.
- Completion saves immediately: the next level unlocks, and the three words are permanently added to the Word Book.

### 9.6 Chapters and level map

Five chapters of ten levels:

1. **Home & Garden** — 1–10
2. **Farm & Animals** — 11–20
3. **Town & Journeys** — 21–30
4. **Nature & Weather** — 31–40
5. **Big Wide World** — 41–50

The level map is a chapter picker with five large colored tabs, each carrying a hand-built SVG emblem rather than a generated illustration. Selecting a chapter shows its ten level tiles in a 2×5 grid. Completed levels show a bucket stamp; the current level is highlighted; locked levels show a lock and a gentle "Finish level {n} first" toast when tapped. The current chapter is selected by default.

### 9.7 Word Book

- A screen reachable from home and from the level-complete screen.
- Shows "{unlocked} of 150 words" for the current locale.
- Grouped by chapter, then by level. Each level row shows its three words as chips.
- Unlocked chips show the word and a small speaker; tapping speaks it again.
- Locked chips show a "?" and the level number, without revealing the word.
- The Word Book is per locale: switching language shows that language's collection.

### 9.8 Home and settings

- Home: large title, bucket mascot, big **Play** (continues at the current level), then **Levels**, **Word Book**, **Settings**. A small Word Book count is visible.
- Settings (grown-up treatment): language (five options with native names), sound on/off, reset progress (press and hold 3 s), about/licenses, and a short "How to play" replay.
- First launch: auto-select the device locale; if unsupported, English. Show the home screen, not a language wall.
- Install hint: a dismissible card on home suggesting "Add to home screen" after the first completed level. Localized.

### 9.9 Language and progress

- Progress is stored **per locale**. A child who has cleared 12 levels in Romanian starts at level 1 in Italian, and the Word Book shows the Italian collection.
- Switching language never deletes progress.
- If the language changes while the child is inside a level that is locked in the new locale, the game returns to that locale's level map with a gentle toast (for example, "That level isn't open in Italiano yet"). It never leaves the child on a forbidden route.
- All UI strings, theme names, chapter names, word audio, and word lists are localized.
- Theme names live in the per-locale content files; UI strings live in Paraglide messages.
- The locale is in the URL (`/ro/...`, `/it/...`, `/en/...`, `/de/...`, `/ru/...`) and remembered in a cookie.

## 10. Content

### 10.1 Shape

Each locale has one typed content file:

```ts
type Locale = 'ro' | 'it' | 'en' | 'de' | 'ru';

interface WordEntry {
	/** Display and puzzle form, uppercase, letters only. */
	word: string;
	/** Optional TTS override when the written form is pronounced differently. */
	spoken?: string;
}

interface LevelContent {
	id: number; // 1..50, aligned across locales
	theme: string; // localized theme label, e.g. "Pets"
	words: [WordEntry, WordEntry, WordEntry];
}

interface LocaleContent {
	locale: Locale;
	levels: LevelContent[]; // exactly 50
}
```

- 50 levels × 3 words × 5 locales = **750 entries**.
- Level ids and themes align across locales. The actual words are chosen per language to fit the theme and the letter limit; they are not literal translations.
- Words are concrete, child-friendly nouns or very familiar words. No verbs that need conjugation, no abstract words, no proper names.
- Length 3–6 letters. No spaces, hyphens, apostrophes, or digits.

### 10.2 Allowed letters

- **English:** `A–Z`.
- **Italian:** `A–Z`, with accented vowels avoided by curation.
- **German:** `A–Z` plus `Ä Ö Ü`. No `ß`, because the game is uppercase and `ß` would become `SS`.
- **Romanian:** `A–Z` plus `Ă Â Î Ș Ț`.
- **Russian:** `А–Я` plus `Ё`.

Content validation rejects anything outside the locale's set and rejects a word containing `ß` in German.

### 10.3 Themes

The 50 themes, in order:

1–10: Pets · Breakfast · In the garden · Colors · Toys · Getting dressed · Family · The bathroom · In the kitchen · Bedtime

11–20: Farm animals · Birds · Forest animals · Bugs · Sea animals · Fruit · Vegetables · Flowers · Trees · Baby animals

21–30: Vehicles · On the street · The bakery · The market · The park · School · The doctor · Jobs · The shop · The train station

31–40: Weather · The sky · The beach · The river · The mountain · Snow · Rain · Night · Sun and moon · Seasons

41–50: Space · The zoo · The circus · Music · Art · Fairy tales · Sports · Travel · Birthday party · Celebration

### 10.4 Word list review

The word lists are authored before assets are generated, and reviewed by the human partner before the audio batch runs. A wrong word costs one audio clip and one re-record, not 750. The review is a table per locale: level, theme, three words, length, gaps, decoys, audio file present.

### 10.5 Validation

A unit test validates every locale on every run:

- exactly 50 levels, ids 1–50, no duplicates;
- exactly 3 words per level, unique within the level;
- 3–6 letters, only the locale's allowed letters;
- gap counts match the level band and the length constraint;
- at least one revealed letter;
- decoys are not in the word and are confusable with a letter that is;
- every word has an audio file and every level has an illustration;
- every Paraglide key exists in all five locales, with no empty values.

## 11. Localization

- Paraglide.js 2 with `project.inlang`, messages in `messages/{locale}.json`.
- Locales: `ro`, `it`, `en`, `de`, `ru`. Base/fallback: `en`.
- URL strategy: localized prefixes; cookie and preferred-language fallbacks.
- Font: Nunito, weights 400/600/700/800, `latin-ext` and `cyrillic` subsets, self-hosted via Fontsource. Verify `Ș Ț Ă Â Î Ș` and Cyrillic capital glyphs at the tile size before building screens.
- Copy tone: short, warm, concrete. Max ~8 words per line in child-facing UI. No idioms.
- Native language names in the switcher: Română, Italiano, English, Deutsch, Русский.
- Numbers and level labels use the locale's conventions only where it matters; level numbers are plain digits.
- Right-to-left is out of scope; all five locales are left-to-right.
- The app `<html lang>` and document title update with the locale.

## 12. Audio

### 12.1 Word clips

- One clip per word per locale, **750 clips**.
- English, Italian, German, Russian: Qwen3-TTS via `music-sfx-voice-studio`'s `/voice` endpoint, one warm voice per locale, instruction "warm, gentle, clear, unhurried, for a young child", language set explicitly.
- Romanian: Piper `ro_RO` voice, installed only for the asset job.
- Generation text: `spoken ?? word.toLowerCase()`; the display word stays uppercase.
- Post-process with ffmpeg: mono, 24 kHz, trim silence, normalise, export MP3 48 kbps. Target under 10 KB per clip.
- Filenames: `static/audio/words/{locale}/l{level:02}-w{index}.mp3` (1-based). No diacritics in filenames.
- A `spoken` override exists for any word the TTS mispronounces. The asset job logs every generated clip and the text used.

### 12.2 Effects and music

- SFX via the studio's procedural `/sfx` endpoint where a clean synth cue is right: `tile-pick`, `tile-place`, `tile-wrong`, `ui-tap`, `coin`.
- Two richer cues via Stable Audio 3 text-to-SFX: a wooden bucket-lid pop for opening, and a warm chime for word/level completion.
- One 20–30 s loopable music bed via `/music`: soft acoustic, marimba/ukulele, 90 bpm, no vocals, quiet. Duck under word clips and SFX.
- All files under `static/audio/sfx/` and `static/audio/music/`.
- One mute control for all audio; persisted. Music starts only after the first user gesture.

### 12.3 Runtime behaviour

- Preload the current level's three word clips and its illustration on level open; preload the next level while idle.
- Replay the word when the bucket opens (once) and on the speaker button.
- Word clips and SFX never overlap: duck music, stop any previous word clip before starting a new one.
- Respect `prefers-reduced-motion` for visual effects, not audio.
- If an audio file is missing, the game continues silently and logs a content-validation failure in development.

## 13. Art

### 13.1 Level illustrations

- 50 images, one per level theme, language-agnostic.
- **Style target:** soft cut-paper storybook diorama; warm cream background; rounded, simple shapes; muted sage, ochre, berry, sky palette; gentle lighting; centered vignette; child-friendly; **no text, no letters, no people**.
- Consistent prompt template + fixed palette + fixed negative prompt, generated with FLUX.2-klein. Three style candidates are generated for one theme and reviewed before the other 49.
- Output: 768×432 WebP, quality ~80, target under 90 KB each. Displayed 16:9 at the top of the level screen.
- A contact sheet of all 50 is reviewed; any image with text, scary shapes, or an off-style look is regenerated.
- `ART-STYLE.md` records the palette, prompt template, negative prompt, and approved examples.

### 13.2 Buckets and UI

- Buckets are hand-built SVG/CSS components, not generated art, so they stay crisp and can animate between closed/open/done.
- Three bucket colors (leaf, ochre, berry) with a shared shape, handle, rim, and lid. Closed: lid + ribbon. Open: lid tipped, soft glow. Done: lid off, star/flag, word label.
- The tile is a rounded square with a thick bottom edge, like a physical letter block, in paper cream with cocoa ink. Revealed and empty slots share the same footprint so the word never reflows.
- The app icon is a bucket with a letter tile, generated as SVG and rasterised to PWA sizes with `@resvg/resvg-js`.
- No gradients that reduce contrast; no shadows that hide the glyph.

### 13.3 Visual rules

- Warm paper background, cocoa ink, calm saturation. Not neon, not gray.
- Letter tiles are the highest-contrast element on the screen.
- The glyph is never covered by decoration.
- Every state has a non-color cue (lid, star, lock, check) for color-vision safety.
- Text at least 16 px; letter tiles at least 44 px; primary actions 48 px.
- `prefers-reduced-motion`: no confetti, no flying tiles; use fades and short scale changes.

## 14. Technical design

### 14.1 Project structure

```
letter-buckets/
  src/
    routes/
      +layout.svelte, +layout.ts, +page.svelte          # home
      levels/+page.svelte                               # chapter picker + level grid
      levels/[level]/+page.svelte                       # bucket screen + word panel
      words/+page.svelte                                # Word Book
      settings/+page.svelte
    lib/
      content/levels.{ro,it,en,de,ru}.ts                # typed word lists
      content/schema.ts, validate.ts
      game/puzzle.ts, puzzle.test.ts                    # gaps, decoys, placement, hints
      game/session.svelte.ts                            # level session state
      storage/save.ts, save.test.ts
      audio/index.ts, audio.test.ts                     # clip playback, ducking, mute
      components/Bucket.svelte, LetterTile.svelte, WordPanel.svelte, ...
      styles/tokens.css, base.css
      paraglide/                                        # generated
    service-worker.ts
    app.html
  messages/{ro,it,en,de,ru}.json
  project.inlang/settings.json
  static/
    art/levels/l01.webp … l50.webp
    audio/words/{locale}/…
    audio/sfx/…, audio/music/…
    icons/…, manifest.webmanifest, favicon.svg
  scripts/
    generate_audio.mjs       # studio/Piper calls + ffmpeg
    generate_art.py          # FLUX engine + WebP
    validate_assets.mjs
  docs/superpowers/specs/…
  vite.config.ts, package.json, tsconfig.json, vercel.json
```

### 14.2 Puzzle engine

Pure TypeScript, no DOM:

```ts
interface PuzzleSpec {
	word: string; // uppercase
	gaps: number[]; // slot indices, deterministic
	decoys: string[]; // letters not in word
}

interface PuzzleState {
	spec: PuzzleSpec;
	placed: Record<number, string>; // slot -> letter
	tray: Tile[]; // remaining tiles with stable ids
	hintStep: 0 | 1 | 2 | 3;
	complete: boolean;
}
```

- `buildPuzzle(level, wordIndex, entry)` derives gaps and decoys deterministically from a seeded PRNG and the level band.
- `place(state, tileId, slot)` returns the next state plus an outcome: `placed | wrong | wrong-word` (the tile belongs elsewhere in this word).
- `hint(state)` advances the hint step.
- `isComplete(state)` is true when every slot is filled.
- The engine owns no timers; the Svelte session owns idle timing.

### 14.3 Session and saving

- Level session: three words, each with a `PuzzleState` once opened; completed word indices; current band.
- Save data:

```ts
interface SaveData {
	version: 1;
	settings: { muted: boolean; coachDone: boolean; installHintDismissed: boolean };
	locales: Record<
		Locale,
		{
			clearedThrough: number; // 0..50
			levelWords: Record<number, number[]>; // completed word indices per level
			unlocked: Record<string, true>; // "level:index" ever completed
			chapterStamps: number[]; // 1..5
		}
	>;
}
```

- Save after every word completion and every level completion. Sanitise on load; corrupt data falls back to a fresh save for that locale, never crashes.
- Current level = `clearedThrough + 1`, capped at 50.
- Replaying a completed level resets its `levelWords` but keeps `unlocked` and `clearedThrough`.
- Reset progress clears the current locale only, behind a 3-second hold; a second confirmation is not needed.

### 14.4 Routing and state

- `/` home; `/levels` chapter picker + grid; `/levels/[level]` level screen; `/words` Word Book; `/settings`.
- The word panel is an overlay within `/levels/[level]`, not a route. The browser back button closes the panel via a history entry, and the visible back arrow does the same.
- Direct navigation to a locked level redirects to `/levels` with a toast.
- Locale-prefixed URLs are handled by Paraglide; the root `/` redirects to the detected locale.

### 14.5 PWA and offline

- SvelteKit 3 built-in service worker (`src/service-worker.ts`), registered in production only; `serviceWorker: { register: false }` in `vite.config.ts`, manual registration via `src/lib/pwa/client.ts`.
- Precache the app shell, fonts, 50 illustrations, all 750 word clips, SFX, and music. Cache per deployment version; delete old caches on activate.
- Navigation: **cache-first** with the cached `200.html` as the SPA document, revalidated quietly in the background when online. Route changes stay instant on a weak signal, and the offline promise is true from the first route change after install. Static assets and audio: cache-first, so word audio plays offline (this differs from Cozy Nook's audio bypass).
- The only network request the game makes is the browser fetching an updated app shell. No game data, no analytics, no third-party call.
- Precache in small concurrent batches so one missing file cannot fail install, and so 750 requests do not stampede.
- Update prompt: reuse the waiting-worker pattern; never reload during play without the child tapping the update card.
- Manifest: name "Letter Buckets", short name "Buckets", cream theme, standalone, portrait-primary, SVG favicon + PNG 192/512/maskable/apple-touch icons.

### 14.6 Performance

- No runtime 3D, no large state library, no icon font. CSS/SVG art and one route bundle per screen.
- Letter tiles use CSS transforms, not layout thrash; drag uses pointer events and a fixed-position ghost.
- Illustrations are `loading="lazy"` and decoded off the critical path; the current level's image is preloaded.
- Audio clips are `preload="none"` until the level opens, then `preload="auto"` for the three current clips.
- Target: first interaction under 2 s on a mid-range phone; 60 fps for panel and tile animations.

### 14.7 Accessibility

- Semantic buttons for buckets, tiles, and slots; `aria-label` includes the word number and state.
- Tray tiles are buttons; slots are buttons with `aria-label` "Empty slot 2 of 4" or "Letter C". Keyboard: Tab, Enter/Space to select or place; Escape closes the panel; focus is trapped in the panel and returns to the bucket on close.
- A polite live region announces "Letter placed", "Word complete", and "Level complete".
- Drag is never required: the tap path is always available and is the documented one.
- Contrast AA for all text and glyphs; 44×44 px minimum; 48 px primary.
- Reduced motion disables confetti, flying tiles, and looping sparkles.
- The illustration is decorative (`alt=""`); the theme title is real text.

### 14.8 Testing

- **Unit:** content validation (all five locales), puzzle engine (deterministic gaps, placement outcomes, hint sequence, completion, decoys), save sanitisation and migration, locale progress isolation.
- **Component:** bucket states, word panel tap flow, drag flow (pointer events), hint button, level complete overlay, Word Book locked/unlocked chips.
- **E2E (Playwright):** first launch → detected locale → level 1 → open bucket → complete a word by tapping → complete by dragging → all three → level complete → reload → progress persisted → switch language → separate progress and Word Book.
- **Visual snapshots:** home, level screen, word panel, level complete, Word Book in English, Romanian, and Russian (covers Latin-ext and Cyrillic).
- **Offline:** build, serve, install the service worker, go offline, reload, complete a word with audio.
- **CI:** format check, `svelte-check`, unit tests, E2E, content/asset validation.

## 15. Asset pipeline

- `scripts/generate_audio.mjs`: reads the five content files, calls the local studio API (`http://127.0.0.1:7910`, bearer token from `data/token`) for EN/IT/DE/RU, runs Piper for RO, post-processes with ffmpeg, writes `static/audio/words/…`, and writes a manifest of what was generated.
- `scripts/generate_art.py`: reads the 50 themes, uses the same mflux FLUX.2-klein pipeline as the local FLUX studio (`Flux2Klein` with `ModelConfig.flux2_klein_4b()`), writes 768×432 WebP to `static/art/levels/…`. A `--style-check` mode generates three candidates for one theme first.
- `scripts/validate_assets.mjs`: checks every word has a clip, every level has an image, every file is under its size budget, and no clip is silent or longer than 3 s.
- The scripts are idempotent and skip existing outputs unless `--force`.
- Generated assets are committed. The app does not need the studios to build or run.
- The studio must be running and the GPU free; the script retries `409 BUSY` with `Retry-After`.
- Review gates: (1) word lists approved by the human partner; (2) three art-style candidates approved by the human partner; (3) contact sheet reviewed by the builder, with outliers regenerated; (4) audio spot-check per locale by the builder, with a short final sample shown to the human partner before release.
- Placeholder policy: a small local placeholder set may be used while building the engine, but placeholders are never committed to the release branch and never shipped. The release build fails content validation unless all 750 clips and 50 illustrations are present.
- If a studio is unavailable, the asset script stops with a clear message; it never writes silent or placeholder files into `static/`.

## 16. Build shape

This is a project, not a small change. The work splits into:

1. **Skeleton and content schema** — SvelteKit 3 project, i18n, fonts, routes, tokens, tests.
2. **Content authoring** — 50 themes × 3 words × 5 locales, validated; human review.
3. **Puzzle engine and level flow** — buckets, word panel, drag/tap, hints, completion, save.
4. **Meta screens** — home, chapters/level map, Word Book, settings, coach marks, install hint.
5. **Art** — style candidates, 50 illustrations, buckets/UI SVG, icons, contact-sheet review.
6. **Audio** — voice selection per locale, 750 clips, SFX, music, pronunciation review.
7. **Polish and hardening** — reduced motion, keyboard/SR pass, visual snapshots, offline E2E, build-size check.
8. **Release** — static build, Vercel config, README, licenses.

Content and art can run in parallel with the engine once the schema is frozen. Audio waits for the word lists.

## 17. Risks and mitigations

| Risk                                                  | Mitigation                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 750 clips make install heavy or slow                  | 48 kbps mono MP3, <10 KB each; batch precache; size budget test in CI.                                  |
| Generated art drifts in style                         | Fixed prompt/palette/negative prompt, 3 candidates first, contact-sheet review, regenerate outliers.    |
| Romanian audio sounds different from the other four   | One voice per locale is expected; keep loudness and pacing matched; a child hears one locale at a time. |
| Diacritics or Cyrillic break a font                   | Nunito latin-ext + cyrillic, glyph smoke test, visual snapshots in RO and RU.                           |
| A 4-year-old cannot parse a 5-letter word with 2 gaps | Max gaps by length, at least one revealed letter, hint chain, tap path, coach marks.                    |
| Localization lengths break layouts                    | No fixed-width text containers; test longest strings (German/Romanian) in snapshots.                    |
| Language switch looks like lost progress              | Per-locale progress is explicit in the UI; show the current locale's count everywhere.                  |
| Dragging fights scrolling on touch                    | Play area never scrolls; `touch-action: none` on tiles; tap path always available.                      |
| Generated images contain accidental text              | Negative prompt "text, letters, words, signage"; contact-sheet review; regenerate.                      |
| Service worker serves stale audio                     | Versioned cache, delete old caches on activate, update toast.                                           |

## 18. What's left to the builder

- The exact gap-placement PRNG and the confusable-letter sets per locale.
- The exact copy for every UI string, within the tone rules.
- The bucket SVG proportions, panel transitions, and celebration choreography.
- The exact voice preset per locale and any `spoken` overrides after listening.
- The FLUX prompt wording beyond the style target, and the final 50 images.
- The level-map and Word Book visual layout details within the rules above.
- CI wiring and the Vercel project.

## 19. Open decisions

- **Name.** "Letter Buckets" is a working title; the README and manifest use it until changed.
- **Word lists.** The 750 entries are authored during the build and approved before audio generation.
- **Art style.** Three candidates are generated and one is chosen before the batch.
- **Voice.** One preset per locale is chosen after a short sample; Romanian uses Piper's best available `ro_RO` voice.

These do not block the plan; each has a review gate before the expensive batch.
