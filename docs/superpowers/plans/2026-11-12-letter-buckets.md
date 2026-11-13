# Letter Buckets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 50-level, five-language, offline word game where a child opens three buckets per level and fills missing letters to unlock each word.

**Architecture:** A static SvelteKit 3 SPA with a pure TypeScript puzzle engine, typed per-locale content, a versioned localStorage save, and pre-generated art/audio served by a cache-first service worker. The level screen shows three buckets; tapping one opens a full-screen word panel with the letter row and a tray. Progress, unlocks, and the Word Book are stored per locale.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, TypeScript, Vite 8, Vitest 4, Testing Library for Svelte, Playwright, Paraglide.js 2, `@sveltejs/adapter-static`, Fontsource Nunito, pnpm.

**Spec:** `letter-buckets/docs/superpowers/specs/2026-11-12-letter-buckets-design.md`

**Working directory:** All commands run from `letter-buckets/` unless a step says otherwise. The project is its own git repository (`git init` inside `letter-buckets/`).

## Global Constraints

- Node 24.x, pnpm, SvelteKit 3 with Svelte 5 runes, TypeScript strict.
- `adapter-static` with `fallback: '200.html'`; `ssr = false`; `prerender = false`.
- Locales: `ro`, `it`, `en`, `de`, `ru`. Base/fallback: `en`. Device language wins; URL prefix wins over cookie.
- No runtime data or API calls. The only network request is the browser fetching an updated app shell.
- One local profile. Progress, unlocked words, and chapter stamps are stored per locale.
- Uppercase words, 3–6 letters, letters only. Allowed: EN `A–Z`; IT `A–Z` (no accented words); DE `A–Z Ä Ö Ü` (no `ß`); RO `A–Z Ă Â Î Ș Ț`; RU `А–Я Ё`.
- Minimum 44×44 px, primary actions 48 px, WCAG AA contrast, tap-only path always available, reduced-motion support.
- 50 levels × 3 words × 5 locales = 750 word entries; 750 word clips; 50 level illustrations.
- Every new UI string is added to all five message files in the same commit; `i18n.test.ts` enforces parity.
- Precache all app assets so every locale works offline after install.
- Commit after every task with a Conventional Commit message.

## Review Focus

These are the failure modes most likely to bite a real child or parent, and each is pinned by a test in the task that owns the code.

1. **Word audio offline after install.** A cached app that cannot play a word clip is not offline. Task 18 fetches a word clip with the browser offline and asserts a 200 from the cache.
2. **A left-open tablet finishing words unattended.** Auto-place must stop after one letter until a real interaction. Task 9 fakes timers and asserts no second auto-place.
3. **Switching language while inside a locked level.** Per-locale progress makes the current route invalid. Task 12 asserts a redirect to that locale's level map with a toast.
4. **Words with repeated letters (e.g. `BALL`).** Two identical tile ids must both exist and placing one must not consume the other. Task 4 and Task 8 test this.
5. **Romanian and Cyrillic glyphs at tile size.** `Ș Ț Ă Â Î` and `Ё Щ Ж` must render, not fall back to tofu. Task 6 pins a visual snapshot; Task 17 repeats it in the full screens.

---

## File Structure

```
letter-buckets/
  package.json, pnpm-lock.yaml, tsconfig.json, vite.config.ts, playwright.config.ts
  project.inlang/settings.json
  messages/{ro,it,en,de,ru}.json
  vercel.json, README.md, LICENSE, ART-STYLE.md
  src/
    app.html, app.d.ts
    routes/
      +layout.svelte, +layout.ts, +page.svelte
      levels/+page.svelte
      levels/[level]/+page.svelte
      words/+page.svelte
      settings/+page.svelte
    lib/
      content/{schema,index,themes,validate,levels.ro,levels.it,levels.en,levels.de,levels.ru}.ts
      game/{puzzle,hints,session.svelte}.ts
      storage/save.ts
      audio/index.ts
      pwa/{client,policy}.ts
      components/{Bucket,LetterTile,WordPanel,Slot,LevelComplete,ChapterTabs,WordChip,CoachMark,InstallHint,UpdateToast}.svelte
      styles/{tokens,base}.css
      i18n.test.ts
      test/setup.ts
    service-worker.ts
  static/
    art/levels/l01.webp … l50.webp
    audio/words/{ro,it,en,de,ru}/l01-w1.mp3 …
    audio/sfx/*.mp3
    audio/music/loop.mp3
    icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
    favicon.svg, manifest.webmanifest
  scripts/
    generate-icons.mjs
    generate_audio.mjs
    generate_art.py
    validate_assets.mjs
    check_build_size.mjs
  tests/
    e2e/{shell,level,word-panel,map,word-book,settings,offline}.spec.ts
    visual/{type,app}.spec.ts
  docs/superpowers/{specs,plans}/
```

Testing split: pure logic and content validation run in Vitest (`node`). Svelte component tests run in Vitest (`jsdom`). Routed flows, drag, offline, and visual snapshots run in Playwright against a production build.

---

### Task 1: Project shell, i18n, fonts, static build

**Files:**

- Create: `letter-buckets/package.json`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `.gitignore`, `prettier.config.js`, `project.inlang/settings.json`, `messages/{ro,it,en,de,ru}.json`, `src/app.html`, `src/app.d.ts`, `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/lib/styles/{tokens,base}.css`, `src/lib/i18n.test.ts`, `src/lib/test/setup.ts`
- Reference: `kids-games-4/package.json`, `kids-games-4/vite.config.ts`, `kids-games-4/tsconfig.json`, `kids-games-4/src/app.html` (a proven SvelteKit 3 setup in this workspace)

**Interfaces:**

- Produces: a building SvelteKit 3 app at `/`, with `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm test`, `pnpm test:e2e`, `pnpm test:visual`; Paraglide `m` available as `#lib/paraglide/messages.js`; five locale message files; Nunito loaded with `latin-ext` and `cyrillic`.
- Vitest has a `server` project (node, `src/**/*.test.ts`) and a `client` project (jsdom, `src/**/*.svelte.test.ts`, `src/lib/test/setup.ts`).
- Playwright has a `chromium` desktop project and a `mobile-chromium` project (Pixel 7), both against `pnpm build && pnpm preview --port 4173`.

- [ ] **Step 1: Create the project files**

Create `letter-buckets/`, run `git init` inside it, and copy the SvelteKit 3 configuration shape from `kids-games-4`, changing:

- package name to `letter-buckets`, `packageManager` to `pnpm@12.6.0`, engine `node >=24`;
- dependencies: `@fontsource/nunito`; dev dependencies: `@inlang/paraglide-js`, `@playwright/test`, `@resvg/resvg-js`, `@sveltejs/adapter-static`, `@sveltejs/kit`, `@sveltejs/vite-plugin-svelte`, `@testing-library/svelte`, `@types/node`, `jsdom`, `prettier`, `prettier-plugin-svelte`, `svelte`, `svelte-check`, `tsx`, `typescript`, `vite`, `vitest`;
- scripts: `dev`, `build`, `preview`, `prepare` (`paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide --emit-ts-declarations && svelte-kit sync`), `check`, `test` (`vitest run`), `test:e2e` (`playwright test tests/e2e`), `test:visual` (`playwright test tests/visual`), `lint`, `format`, `icons`, `content:export` (`tsx scripts/export_content.ts`), `assets:audio`, `assets:art`, `validate:assets`;
- `vite.config.ts`: `sveltekit({ serviceWorker: { register: false }, compilerOptions: { runes: … }, adapter: adapter({ fallback: '200.html' }) })`, Paraglide with locales `['ro','it','en','de','ru']`, base `en`, URL patterns `/:path(.*)?` → `/ro/:path(.*)?` etc.;
- `project.inlang/settings.json`: locales `['ro','it','en','de','ru']`, base `en`, message path `./messages/{locale}.json`;
- `src/app.html`: `lang="en"`, title `Letter Buckets`, cream theme color, manifest link, viewport-fit cover;
- `src/routes/+layout.ts`: `export const ssr = false; export const prerender = false;`;
- `src/routes/+layout.svelte`: imports the two stylesheets, renders `{@render children()}`;
- `src/routes/+page.svelte`: a minimal home with the app name and a Play link to `/levels`;
- `src/lib/styles/base.css`: Nunito `latin-ext` and `cyrillic` 400/600/700/800 imports, box-sizing, background, focus-visible, safe-area padding;
- `src/lib/styles/tokens.css`: the warm paper/cocoa/leaf/ochre/berry palette and spacing from the spec;
- `.gitignore`: `node_modules`, `.svelte-kit`, `build`, `test-results`, `playwright-report`, `candidates`;
- `prettier.config.js`: Svelte plugin, single quotes, tabs, width 100;
- `src/lib/test/setup.ts`: `matchMedia` mock and a Map-backed `localStorage` fallback for jsdom;
- `playwright.config.ts`: `testDir: 'tests'`, `webServer: { command: 'pnpm build && pnpm preview --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI }`, projects `chromium` and `mobile-chromium` (Pixel 7), `use.baseURL = 'http://127.0.0.1:4173'`;
- Vitest `test.projects`: `server` (node, `src/**/*.test.ts`, excludes `*.svelte.test.ts`) and `client` (jsdom, `src/**/*.svelte.test.ts`, `setupFiles: ['./src/lib/test/setup.ts']`).

Run `pnpm install` before the first test so `pnpm-lock.yaml` is created.

- [ ] **Step 2: Write the failing i18n parity test**

```ts
// src/lib/i18n.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LOCALES = ['ro', 'it', 'en', 'de', 'ru'] as const;
const read = (locale: string) =>
	JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));

describe('messages', () => {
	it('has the same non-empty keys in every locale', () => {
		const base = read('en');
		const keys = Object.keys(base).sort();
		for (const locale of LOCALES) {
			const messages = read(locale);
			expect(Object.keys(messages).sort()).toEqual(keys);
			for (const key of keys) expect(messages[key].trim()).not.toBe('');
		}
	});
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test src/lib/i18n.test.ts`
Expected: FAIL because `messages/en.json` or the other locale files do not exist yet.

- [ ] **Step 4: Add the five message files**

Start with the keys the shell uses: `app_name`, `tagline`, `play`, `levels`, `word_book`, `settings`, `back`, `next`, `close`. Translate each into the five locales with native, child-friendly wording. English is the source and fallback.

- [ ] **Step 5: Run tests and the build**

Run: `pnpm test src/lib/i18n.test.ts && pnpm check && pnpm build`
Expected: PASS; `build/200.html` exists.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold Letter Buckets shell with five locales"
```

---

### Task 2: PWA shell, cache policy, icons

**Files:**

- Create: `src/lib/pwa/policy.ts`, `src/lib/pwa/policy.test.ts`, `src/lib/pwa/client.ts`, `src/service-worker.ts`, `static/manifest.webmanifest`, `static/favicon.svg`, `scripts/generate-icons.mjs`
- Modify: `vite.config.ts` (service worker registration already disabled), `src/routes/+layout.svelte` (call `initPwa` on mount)

**Interfaces:**

- Produces: `decide(input: DecisionInput, origin: string): 'navigation' | 'cache-first' | 'bypass'`; `initPwa(): void`; `onUpdateReady(listener): () => void`; `applyUpdate(): void`.
- The service worker precaches `$app/manifest` assets plus `/200.html`, batches writes, and deletes old caches on activate.

- [ ] **Step 1: Write the failing cache-policy tests**

```ts
// src/lib/pwa/policy.test.ts
import { describe, expect, it } from 'vitest';
import { decide } from './policy.js';

const app = 'https://letterbuckets.test';
const input = (over: Partial<Parameters<typeof decide>[0]>) => ({
	method: 'GET',
	url: `${app}/levels`,
	origin: app,
	mode: 'navigate',
	destination: 'document',
	...over
});

describe('decide', () => {
	it('serves navigations from the cached shell', () => {
		expect(decide(input({}), app)).toBe('navigation');
	});
	it('serves same-origin audio cache-first', () => {
		expect(
			decide(
				input({ mode: 'no-cors', destination: 'audio', url: `${app}/audio/words/en/l01-w1.mp3` }),
				app
			)
		).toBe('cache-first');
	});
	it('serves same-origin images, fonts, scripts and styles cache-first', () => {
		for (const destination of ['image', 'font', 'script', 'style']) {
			expect(decide(input({ mode: 'no-cors', destination, url: `${app}/x` }), app)).toBe(
				'cache-first'
			);
		}
	});
	it('bypasses non-GET and cross-origin requests', () => {
		expect(decide(input({ method: 'POST' }), app)).toBe('bypass');
		expect(decide(input({ origin: 'https://other.test' }), app)).toBe('bypass');
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/pwa/policy.test.ts`
Expected: FAIL because `policy.ts` does not exist.

- [ ] **Step 3: Implement the policy and service worker**

`decide` returns `navigation` for `mode === 'navigate'` and same-origin GET; `cache-first` for same-origin GET with destination `audio`, `image`, `font`, `script`, `style`, `manifest`; `bypass` otherwise.

`src/service-worker.ts`:

- cache name `letter-buckets-${version}`; `INDEX = '/200.html'`;
- `PRECACHE = [...immutable.map(resolve), ...assets.map(resolve)]`;
- install: open cache, add `[...PRECACHE, INDEX]` in batches of 8 with `.catch(() => {})` per entry;
- activate: delete other caches, `clients.claim()`;
- message `SKIP_WAITING` → `skipWaiting()`;
- fetch: call `decide`; for `navigation`, return the cached `200.html` immediately and refresh it in `event.waitUntil(fetch(...))`; for `cache-first`, return the cache match or fetch and store; for `bypass`, return;
- never cache cross-origin or non-GET.

Copy `src/lib/pwa/client.ts` from `kids-games-4/src/lib/pwa/client.ts` unchanged except the cache name is owned by the worker.

- [ ] **Step 4: Add the manifest and icons**

`static/manifest.webmanifest`: name `Letter Buckets`, short name `Buckets`, start `/`, display `standalone`, orientation `portrait-primary`, background/theme `#fdf6e9`, icons 192/512/maskable.

`static/favicon.svg`: a cream letter tile sitting in a leaf-green bucket.

`scripts/generate-icons.mjs`: use `@resvg/resvg-js` to read the SVG and write `static/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.

- [ ] **Step 5: Run tests and build**

Run: `pnpm test src/lib/pwa/policy.test.ts && pnpm icons && pnpm build`
Expected: PASS; `build/service-worker.js`, `build/200.html`, and the four icon files exist.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add offline PWA shell and cache-first service worker"
```

---

### Task 3: Content schema, validator, and the 750-word content

**Files:**

- Create: `src/lib/content/schema.ts`, `src/lib/content/rules.ts`, `src/lib/content/index.ts`, `src/lib/content/themes.ts`, `src/lib/content/validate.ts`, `src/lib/content/validate.test.ts`, `src/lib/content/levels.{ro,it,en,de,ru}.ts`, `scripts/export_content.ts`
- Test: `src/lib/content/validate.test.ts`

**Interfaces:**

- Produces: `type Locale = 'ro' | 'it' | 'en' | 'de' | 'ru'`; `interface WordEntry { word: string; spoken?: string }`; `interface LevelContent { id: number; theme: string; words: [WordEntry, WordEntry, WordEntry] }`; `interface LocaleContent { locale: Locale; levels: LevelContent[] }`;
- `LEVEL_COUNT = 50`; `CONTENT: Record<Locale, LocaleContent>`; `getLevelContent(locale, level): LevelContent`; `getLevelArt(level): string`; `THEME_PROMPTS: readonly string[]` (50 English art prompts, language-agnostic);
- `ALPHABETS: Record<Locale, RegExp>`; `isAllowedWord(locale, word): boolean`; `gapCountForLevel(level: number, wordLength: number): number` (the single source of truth used by the validator and the puzzle engine);
- `validateContent(content: Record<Locale, LocaleContent>, options?: { requireAssets?: boolean }): ContentIssue[]`;
- `scripts/export_content.ts` writes `scripts/content.json` and `scripts/themes.json` from the typed content; `pnpm content:export` runs it with `tsx`.

- [ ] **Step 1: Write the schema and failing validation tests**

```ts
// src/lib/content/validate.test.ts
import { describe, expect, it } from 'vitest';
import { CONTENT, LEVEL_COUNT } from './index.js';
import { validateContent } from './validate.js';

describe('content', () => {
	it('is valid in all five locales', () => {
		expect(validateContent(CONTENT)).toEqual([]);
	});
	it('has exactly 50 levels per locale', () => {
		for (const locale of Object.keys(CONTENT) as (keyof typeof CONTENT)[]) {
			expect(CONTENT[locale].levels).toHaveLength(LEVEL_COUNT);
		}
	});
	it('rejects a word outside the locale alphabet', () => {
		const broken = structuredClone(CONTENT);
		broken.de.levels[0].words[0].word = 'STRAßE';
		const issues = validateContent(broken);
		expect(issues.some((i) => i.message.includes('ß'))).toBe(true);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/content/validate.test.ts`
Expected: FAIL because the content modules and validator do not exist.

- [ ] **Step 3: Implement the validator**

`validateContent` returns an array of `{ locale, level?, word?, message }` and checks:

- 50 levels, ids 1–50 in order, no duplicates;
- 3 words per level, unique within the level;
- 3–6 letters, only the locale alphabet, no spaces/digits/punctuation;
- no German `ß`, no Italian accented vowels, no lowercase;
- gaps by `gapCountForLevel`: 1 for 1–20, 2 for 21–40, 2–3 for 41–50 (3 only when length ≥ 5), capped at `length - 2` and at 3;
- at least two revealed letters;
- `theme` non-empty;
- when `requireAssets` is true, every word clip `static/audio/words/{locale}/l{02}-w{i}.mp3` and every level image `static/art/levels/l{02}.webp` exists.

`gapCountForLevel(level, wordLength)` is the one place the band rules live; the puzzle engine imports it. `isAllowedWord` uses `ALPHABETS` plus the `ß` and Italian-accent rules.

- [ ] **Step 4: Author the five word lists, chapter by chapter**

Use the 50 themes from the spec. Every theme gets exactly three concrete, familiar words in each locale; the words fit the theme and the locale's letter rules, not a literal translation. Level 1 is the quality bar:

| Locale | Level 1 — Pets       |
| ------ | -------------------- |
| en     | CAT, DOG, MOUSE      |
| ro     | CÂINE, PISICĂ, PEȘTE |
| it     | GATTO, CANE, TOPO    |
| de     | KATZE, HUND, MAUS    |
| ru     | КОТ, ПЁС, РЫБА       |

Write the lists in five steps:

1. Chapter 1 (levels 1–10) in all five locales.
2. Chapter 2 (11–20).
3. Chapter 3 (21–30).
4. Chapter 4 (31–40).
5. Chapter 5 (41–50).

Author in that order, but run `pnpm test src/lib/content/validate.test.ts` only after all five are in; a partial content file is expected to fail the 50-level check. When all five chapters are in, run `pnpm content:export` to write `scripts/content.json` and `scripts/themes.json` for the art/audio/asset scripts.

- [ ] **Step 5: Present the lists to the human partner**

Show one table per locale with level, theme, three words, lengths, gaps, and decoys. The human partner approves or marks words to replace. Do not start the audio batch (Task 16) before this approval.

- [ ] **Step 6: Commit**

```bash
git add ./src/lib/content
git commit -m "content: add 50 themed levels in five locales"
```

---

### Task 4: Pure puzzle engine

**Files:**

- Create: `src/lib/game/puzzle.ts`, `src/lib/game/puzzle.test.ts`

**Interfaces:**

- Produces:
  - `interface PuzzleSpec { level: number; wordIndex: number; word: string; gaps: number[]; decoys: string[] }`
  - `interface Tile { id: string; letter: string; decoy: boolean }`
  - `interface PuzzleState { spec: PuzzleSpec; placed: Record<number, string>; remaining: Tile[] }`
  - `type PlaceOutcome = 'placed' | 'wrong' | 'wrong-word'`
  - `interface PlaceResult { state: PuzzleState; outcome: PlaceOutcome; suggestedSlot?: number }`
  - `buildPuzzle(input: { level: number; wordIndex: number; word: string; locale: Locale }): PuzzleSpec`
  - `createPuzzleState(spec: PuzzleSpec): PuzzleState`
  - `placeTile(state: PuzzleState, tileId: string, slot: number): PlaceResult`
  - `hintTarget(state: PuzzleState): { slot: number; tileId: string } | null`
  - `isComplete(state: PuzzleState): boolean`
- Consumes: `gapCountForLevel` from `src/lib/content/rules.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/game/puzzle.test.ts
import { describe, expect, it } from 'vitest';
import { buildPuzzle, createPuzzleState, hintTarget, isComplete, placeTile } from './puzzle.js';

describe('buildPuzzle', () => {
	it('puts the only gap on the final letter at level 1', () => {
		const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
		expect(spec.gaps).toEqual([2]);
		expect(spec.decoys).toEqual([]);
	});
	it('is deterministic for the same level, word and locale', () => {
		const a = buildPuzzle({ level: 27, wordIndex: 1, word: 'HOUSE', locale: 'en' });
		const b = buildPuzzle({ level: 27, wordIndex: 1, word: 'HOUSE', locale: 'en' });
		expect(a).toEqual(b);
	});
	it('never leaves fewer than two revealed letters', () => {
		for (const word of ['CAT', 'BALL', 'HOUSE', 'FLOWER']) {
			for (let level = 1; level <= 50; level++) {
				const spec = buildPuzzle({ level, wordIndex: 0, word, locale: 'en' });
				expect(spec.gaps.length).toBeLessThanOrEqual(Math.min(3, word.length - 2));
				expect(new Set(spec.gaps).size).toBe(spec.gaps.length);
			}
		}
	});
	it('adds confusable decoys only in the late bands', () => {
		const early = buildPuzzle({ level: 20, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		const late = buildPuzzle({ level: 45, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		expect(early.decoys).toHaveLength(0);
		expect(late.decoys).toHaveLength(2);
		for (const decoy of late.decoys) expect(late.word).not.toContain(decoy);
	});
});

describe('placeTile', () => {
	const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
	it('places the correct letter and completes the word', () => {
		const state = createPuzzleState(spec);
		const tile = state.remaining.find((t) => t.letter === 'T')!;
		const result = placeTile(state, tile.id, 2);
		expect(result.outcome).toBe('placed');
		expect(isComplete(result.state)).toBe(true);
	});
	it('rejects a letter that belongs to another empty slot and suggests it', () => {
		const twoGap = buildPuzzle({ level: 25, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		const state = createPuzzleState(twoGap);
		const [slotA, slotB] = twoGap.gaps;
		const wrong = state.remaining.find((t) => t.letter === twoGap.word[slotB])!;
		const result = placeTile(state, wrong.id, slotA);
		expect(result.outcome).toBe('wrong-word');
		expect(result.suggestedSlot).toBe(slotB);
	});
	it('keeps both identical tiles for a repeated letter', () => {
		const ball = { level: 25, wordIndex: 0, word: 'BALL', gaps: [2, 3], decoys: [] };
		const state = createPuzzleState(ball);
		const ls = state.remaining.filter((t) => t.letter === 'L');
		expect(ls).toHaveLength(2);
		expect(new Set(ls.map((t) => t.id)).size).toBe(2);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/game/puzzle.test.ts`
Expected: FAIL because `puzzle.ts` does not exist.

- [ ] **Step 3: Implement the engine**

- Seeded PRNG: `mulberry32(hashString(`${locale}:${level}:${wordIndex}:${word}`))`.
- Gap count: levels 1–20 → 1; 21–40 → 2; 41–50 → 3 when `word.length >= 5`, else 2; cap at `Math.min(3, word.length - 2)`. Import `gapCountForLevel` from the content rules instead of re-encoding the bands.
- Positions: level 1–10 → last letter; otherwise seeded distinct positions from `0..word.length-1`. After choosing, if fewer than two letters remain revealed, add positions at the end until two are revealed.
- Decoys: 0 for levels 1–30, 1 for 31–40, 2 for 41–50. Pick from `CONFUSABLES[locale]` for a letter present in the word, excluding letters already in the word and duplicates. Fallback to a seeded letter from the locale alphabet that is not in the word.
- `createPuzzleState` builds one tile per gap (duplicates get unique ids `t0`, `t1`, …) plus decoys, then shuffles deterministically with the same seed.
- `placeTile`: unknown tile or filled slot → `wrong`; letter matches the slot → `placed`; letter matches another empty slot → `wrong-word` with that slot; otherwise `wrong`.
- `hintTarget`: first empty slot and the first remaining tile with that letter.
- `isComplete`: every gap slot is in `placed`.

Add `CONFUSABLES` for `en`, `it`, `de`, `ro`, `ru` (e.g. `B/D`, `P/Q`, `M/N`, `Ș/S`, `Ä/A`, `Ш/Щ`, `Ь/Ъ`). The exact sets are a builder call; tests only require a decoy not in the word.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/game/puzzle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ./src/lib/game
git commit -m "feat: add deterministic puzzle engine"
```

---

### Task 5: Versioned, per-locale save store

**Files:**

- Create: `src/lib/storage/save.ts`, `src/lib/storage/save.test.ts`

**Interfaces:**

- Produces: `SaveData`, `LocaleProgress`, `KeyValueStorage`, `SAVE_KEY = 'letter-buckets-save'`;
- `defaultSave(): SaveData`; `loadSave(storage?): SaveData`; `persistSave(data, storage): void`;
- `getLocaleProgress(data, locale): LocaleProgress`; `currentLevel(data, locale): number`; `isLevelOpen(data, locale, level): boolean`;
- `markWordComplete(data, locale, level, wordIndex): void`; `markLevelComplete(data, locale, level): void`; `resetLevelWords(data, locale, level): void`; `resetLocale(data, locale): void`; `wordKey(level, index): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/storage/save.test.ts
import { describe, expect, it } from 'vitest';
import {
	currentLevel,
	defaultSave,
	loadSave,
	markLevelComplete,
	markWordComplete,
	resetLevelWords,
	wordKey
} from './save.js';

function storage(initial?: string) {
	const map = new Map<string, string>(initial ? [['letter-buckets-save', initial]] : []);
	return {
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => void map.set(k, v)
	};
}

describe('save', () => {
	it('starts every locale at level 1', () => {
		expect(currentLevel(defaultSave(), 'en')).toBe(1);
		expect(currentLevel(defaultSave(), 'ru')).toBe(1);
	});
	it('keeps progress separate per locale', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0);
		markWordComplete(data, 'en', 1, 1);
		markWordComplete(data, 'en', 1, 2);
		expect(currentLevel(data, 'en')).toBe(2);
		expect(currentLevel(data, 'ro')).toBe(1);
	});
	it('unlocks a word permanently even when the level is replayed', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0);
		resetLevelWords(data, 'en', 1);
		expect(data.locales.en.unlocked[wordKey(1, 0)]).toBe(true);
		expect(data.locales.en.levelWords[1]).toEqual([]);
	});
	it('falls back to a fresh save on corrupt data', () => {
		expect(loadSave(storage('not json'))).toEqual(defaultSave());
		expect(loadSave(storage('{"version":99}'))).toEqual(defaultSave());
	});
	it('marks the chapter stamp at the end of a chapter', () => {
		const data = defaultSave();
		markLevelComplete(data, 'en', 10);
		expect(data.locales.en.chapterStamps).toEqual([1]);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/storage/save.test.ts`
Expected: FAIL because `save.ts` does not exist.

- [ ] **Step 3: Implement the save store**

Use the exact schema from the spec:

```ts
interface LocaleProgress {
	clearedThrough: number;
	levelWords: Record<number, number[]>;
	unlocked: Record<string, true>;
	chapterStamps: number[];
}
interface SaveData {
	version: 1;
	settings: { muted: boolean; coachDone: boolean; installHintDismissed: boolean };
	locales: Record<Locale, LocaleProgress>;
}
```

- `loadSave` parses JSON, requires `version === 1`, sanitises every locale: `clearedThrough` integer 0–50, `levelWords` keys 1–50 and values unique integers 0–2, `unlocked` keys matching `^\d{1,2}:[0-2]$`, `chapterStamps` unique 1–5. Unknown/corrupt data falls back to the default for that locale, never throws.
- `markWordComplete` adds the index to `levelWords[level]` and `unlocked[wordKey(level, index)]`; when all three are present it calls `markLevelComplete`.
- `markLevelComplete` sets `clearedThrough = Math.max(clearedThrough, level)` and adds `Math.ceil(level / 10)` to `chapterStamps` when missing.
- `currentLevel` returns `Math.min(50, clearedThrough + 1)`; `isLevelOpen` is `level === 1 || level <= clearedThrough + 1`.
- `resetLevelWords` clears only that level's `levelWords`; `resetLocale` resets only that locale.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/storage/save.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ./src/lib/storage
git commit -m "feat: add versioned per-locale save store"
```

---

### Task 6: Tokens, letter tile, bucket, and glyph smoke test

**Files:**

- Create: `src/lib/components/LetterTile.svelte`, `src/lib/components/Bucket.svelte`, `src/routes/dev/type/+page.svelte`, `tests/visual/type.spec.ts`, `src/lib/components/Bucket.svelte.test.ts`
- Modify: `src/lib/styles/tokens.css`, `src/lib/styles/base.css`

**Interfaces:**

- `LetterTile` props: `letter: string; state: 'revealed' | 'empty' | 'tile' | 'selected' | 'placed'; label?: string; onclick?: () => void`.
- `Bucket` props: `index: 1 | 2 | 3; state: 'closed' | 'open' | 'done'; word?: string; onclick?: () => void`.
- Produces: `data-state` attributes on both for tests; bucket SVG shape and tile metrics used by later screens.

- [ ] **Step 1: Write the failing component test**

```ts
// src/lib/components/Bucket.svelte.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Bucket from './Bucket.svelte';

describe('Bucket', () => {
	it('labels a closed bucket by its word number', () => {
		render(Bucket, { index: 1, state: 'closed' });
		expect(screen.getByRole('button', { name: /open word 1/i })).toBeTruthy();
	});
	it('shows the word when done', () => {
		render(Bucket, { index: 2, state: 'done', word: 'CAT' });
		expect(screen.getByText('CAT')).toBeTruthy();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/components/Bucket.svelte.test.ts`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the tile and bucket**

- `LetterTile`: a rounded square with a thick bottom edge; revealed/placed cream with cocoa glyph; empty is dashed with no glyph; tile is cream with a raised edge; selected lifts and rings. Minimum 44px; `touch-action: none`.
- `Bucket`: hand-built SVG pail with handle, rim, lid. Closed has a lid and ribbon; open has a tipped lid and soft glow; done has an open lid, a star/flag, and the word label. Use `aria-label` "Open word {n}" / "Word {n}, {word}, tap to hear it". `data-state`.
- `/dev/type`: renders the full alphabets at 44, 56, and 72px: Latin `ABCDEFGHIJKLMNOPQRSTUVWXYZ`, Romanian `ĂÂÎȘȚ`, German `ÄÖÜ`, Cyrillic `АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ`. It is unlinked and harmless in production, so the visual test can run against the production build.
- `tests/visual/type.spec.ts`: `page.goto('/en/dev/type')`, `expect(page).toHaveScreenshot('type.png')`.

- [ ] **Step 4: Run tests and the snapshot**

Run: `pnpm test src/lib/components/Bucket.svelte.test.ts && pnpm test:visual --update-snapshots`
Expected: PASS; a `type.png` baseline is written. Inspect it: no tofu, `Ș Ț Ă Â Î`, `Ä Ö Ü`, `Ё Щ Ж` all render.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add letter tiles, buckets, and glyph coverage check"
```

---

### Task 7: Level session and bucket screen

**Files:**

- Create: `src/lib/game/session.svelte.ts`, `src/lib/game/session.test.ts`, `src/routes/levels/[level]/+page.svelte`, `src/routes/levels/+page.svelte` (placeholder, Task 10 fills it), `src/lib/components/LevelComplete.svelte` (shell, fleshed out in Task 9), `tests/e2e/level.spec.ts`
- Modify: `src/lib/components/WordPanel.svelte` (created here as a shell; filled in Task 8)

**Interfaces:**

- `interface BucketState { index: 0 | 1 | 2; status: 'closed' | 'open' | 'done'; word?: string }`
- `interface LevelSession`
  - `level: number`, `locale: Locale`, `content: LevelContent`, `buckets: BucketState[]`, `openIndex: number | null`, `word: PuzzleState | null`, `complete: boolean`
  - `openBucket(index): void`; `closeWord(): void`; `place(tileId, slot): PlaceResult`; `hint(): void`; `reset(): void`
- `createLevelSession(level, locale, options?: { progress?: LocaleProgress; onWordComplete?; onLevelComplete? }): LevelSession`
- Consumes: `buildPuzzle`, `createPuzzleState`, `placeTile`, `getLevelContent`, `LocaleProgress`, `PlaceResult`.

- [ ] **Step 1: Write the failing session tests**

Test: a new session has three closed buckets; `openBucket(0)` creates a puzzle; completing a word calls `onWordComplete` and marks that bucket done; completing all three sets `complete` and calls `onLevelComplete`; a session created from a save with two completed words shows two done buckets; `reset()` returns all three to closed without clearing the save.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/game/session.test.ts`
Expected: FAIL because `session.svelte.ts` does not exist.

- [ ] **Step 3: Implement the session**

Use Svelte 5 `$state` inside `session.svelte.ts`. Keep all content and save writes behind callbacks so the session is testable without localStorage. When a word completes, call `onWordComplete(level, wordIndex)`; when the third completes, call `onLevelComplete(level)`. `reset()` clears the in-memory word states only.

- [ ] **Step 4: Build the level screen**

`/levels/[level]/+page.svelte`:

- reads `page.params.level`, loads the save, and redirects to `/levels` when the level is out of range or locked (the toast arrives in Task 10);
- creates the session with `progress: getLocaleProgress(data, locale)`, so completed words from a previous visit show as done buckets;
- renders header (back, level number, theme name, sound toggle), the 16:9 theme banner from `getLevelArt(level)`, the three `Bucket` cards, and "{done} of 3 words";
- opens `WordPanel` when `openIndex !== null`;
- renders `LevelComplete` when `complete` and no word panel is open;
- shows a "Play again" action when the level is already cleared, calling `session.reset()`.

- [ ] **Step 5: Add the E2E test**

`tests/e2e/level.spec.ts`: go to `/en/levels/1`; expect three buttons named `/open word/i`; tap the first; expect the word panel; close it; go to `/en/levels/50` and expect a redirect to `/en/levels`.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm test src/lib/game/session.test.ts && pnpm test:e2e tests/e2e/level.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add level session and bucket screen"
```

---

### Task 8: Word panel, drag and tap

**Files:**

- Create: `src/lib/components/WordPanel.svelte`, `src/lib/components/Slot.svelte`, `src/lib/components/WordPanel.svelte.test.ts`, `tests/e2e/word-panel.spec.ts`
- Modify: `src/lib/components/LetterTile.svelte`

**Interfaces:**

- `WordPanel` props: `session: LevelSession; onclose: () => void`.
- `Slot` props: `index: number; letter: string; filled: boolean; suggested?: boolean; onplace: () => void`.
- Consumes: `session.place`, `session.word`, `hintTarget`.
- Produces: `data-slot="{index}"` and `data-letter="{letter}"` on each slot (the letter is for tests, not announced), `data-tile="{tile.id}"` on each tray tile, `data-selected` on the selected tile.

- [ ] **Step 1: Write the failing E2E tests**

`tests/e2e/word-panel.spec.ts`:

- tap path: open level 1 bucket 1; read the missing letter from the fixture; tap its tray tile; tap the empty slot; expect the slot filled and the word complete; expect the completion panel and "Back to buckets".
- drag path: same word, use `page.mouse` to press the tile center, move to the slot center in 8 steps, release; expect the same result.
- wrong path: drag a decoy (level 31) or a wrong letter; expect the tile returns and the slot is empty.
- repeated letters: a component test renders a fake session with two `L` tiles for `BALL`; tapping one and placing it leaves the second `L` in the tray.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:e2e tests/e2e/word-panel.spec.ts`
Expected: FAIL because the panel and tile interactions do not exist.

- [ ] **Step 3: Implement tap-first**

- The word row renders one `Slot` per letter; revealed letters are `LetterTile state="revealed"`, gaps are `Slot`.
- The tray renders `LetterTile state="tile"` for each remaining tile.
- Tap a tile → selected; tap a slot → `session.place`; on `placed`, clear selection; on `wrong`/`wrong-word`, bounce the tile and clear selection; on `wrong-word`, set `suggested` on `suggestedSlot` for 900ms.
- A polite `aria-live` region announces "Letter placed", "Word complete", and the missing-letter count.

- [ ] **Step 4: Add pointer drag**

- On `pointerdown` on a tray tile, record the id and start point; after a 6px movement, set a fixed-position ghost that follows the pointer with `pointer-events: none`; call `setPointerCapture`.
- On `pointerup`, hide the ghost and use `document.elementFromPoint(x, y)?.closest('[data-slot]')` to find the target; call `session.place`.
- If no slot is hit, the tile returns; no state changes.
- `touch-action: none` on tiles and slots; the panel itself does not scroll.
- Keyboard: tiles and slots are buttons; Enter/Space selects/places; Escape closes the panel and returns focus to the bucket.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test src/lib/components/WordPanel.svelte.test.ts && pnpm test:e2e tests/e2e/word-panel.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add tap and drag word panel"
```

---

### Task 9: Hints, word completion, level complete

**Files:**

- Create: `src/lib/game/hints.ts`, `src/lib/game/hints.test.ts`, `tests/e2e/hints.spec.ts`
- Modify: `src/lib/game/session.svelte.ts`, `src/lib/components/WordPanel.svelte`, `src/lib/components/LevelComplete.svelte`, `src/routes/levels/[level]/+page.svelte`

**Interfaces:**

- `type HintAction = { kind: 'pulse-slot'; slot: number } | { kind: 'pulse-tile'; tileId: string } | { kind: 'auto-place'; tileId: string; slot: number } | { kind: 'locked' }`.
- `nextHintAction(state: PuzzleState, step: 0 | 1 | 2 | 3): HintAction`.
- Session adds `hintStep: 0 | 1 | 2 | 3`, `requestHint(): void`, `noteInteraction(): void`, `pauseHints()`, `resumeHints()`.

- [ ] **Step 1: Write the failing hint tests**

```ts
// src/lib/game/hints.test.ts
import { describe, expect, it } from 'vitest';
import { buildPuzzle, createPuzzleState } from './puzzle.js';
import { nextHintAction } from './hints.js';

const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
const state = createPuzzleState(spec);

describe('nextHintAction', () => {
	it('pulses the slot, then the tile, then auto-places once', () => {
		expect(nextHintAction(state, 0).kind).toBe('pulse-slot');
		expect(nextHintAction(state, 1).kind).toBe('pulse-tile');
		expect(nextHintAction(state, 2).kind).toBe('auto-place');
		expect(nextHintAction(state, 3).kind).toBe('locked');
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/game/hints.test.ts`
Expected: FAIL because `hints.ts` does not exist.

- [ ] **Step 3: Implement the hint state machine and timers**

- `nextHintAction` returns the hint for the first empty slot: step 0 slot, step 1 tile, step 2 auto-place, step 3 locked.
- Session: idle 10s → step 0; another 10s → step 1; another 10s → step 2 (auto-place one letter), then set step 3. Any interaction (`noteInteraction`) resets to step 0. `document.visibilitychange` pauses/resumes timers. The hint button calls `requestHint()` immediately.
- After auto-place, the step stays 3 until the child taps/drags/presses a key. No second auto-place; the test advances fake timers by 60s and asserts exactly one tile was placed.
- The hint button is always visible in the word panel, alongside the speaker and close controls.
- A completed word speaks the word, plays `word-complete`, shows the completion panel with a "Back to buckets" button. Closing it returns to the bucket row. The third completion sets `complete`; `LevelComplete` appears only after the word panel closes, showing the three words and speaker buttons.
- At levels 10, 20, 30, 40, and 50, `LevelComplete` shows the chapter stamp. At level 50 it becomes the final celebration with a Word Book shortcut.
- Save via callbacks: word completion calls `markWordComplete(data, locale, level, index)` and persists; level completion calls `markLevelComplete(data, locale, level)` and persists.

- [ ] **Step 4: Add the E2E test**

`tests/e2e/hints.spec.ts`: install `page.clock` before navigation; open a word, press the hint button three times; expect the first two to highlight and the third to place one letter; `fastForward(20_000)` and expect no second placement; tap a tile and expect the hint cycle to be available again.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test src/lib/game/hints.test.ts && pnpm test:e2e tests/e2e/hints.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add gentle hint chain and level completion"
```

---

### Task 10: Home, chapters, and level map

**Files:**

- Create: `src/lib/components/ChapterTabs.svelte`, `tests/e2e/map.spec.ts`
- Modify: `src/routes/+page.svelte`, `src/routes/levels/+page.svelte`

**Interfaces:**

- Consumes: `currentLevel`, `isLevelOpen`, `CONTENT`, `m`, `audio`.
- Produces: chapter tabs 1–5, ten level tiles each, states `done | current | locked`, toast for locked taps, Play/Levels/Word Book/Settings home actions.

- [ ] **Step 1: Write the failing E2E tests**

`tests/e2e/map.spec.ts`:

- home Play goes to the current level (`/en/levels/1` on a fresh save);
- the map shows exactly ten tiles in the selected chapter;
- level 2 is locked on a fresh save and tapping it shows the "Finish level 1 first" toast;
- completing level 1 in the fixture save makes level 2 current and level 1 done;
- switching chapter shows levels 11–20.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:e2e tests/e2e/map.spec.ts`
Expected: FAIL because the map and home do not exist.

- [ ] **Step 3: Implement home and map**

- Home: title, bucket mascot, big Play (current level), Levels, Word Book with `{unlocked}/150`, Settings, sound toggle, and a five-stamp chapter strip filled from `chapterStamps`.
- Map: five large chapter tabs with SVG emblems (house, barn, shop, cloud, star), selected by default from the current level; 2×5 level grid; done = bucket stamp, current = highlighted, locked = lock; locked tap shows a toast and plays `tile-wrong` quietly.
- Use `$derived` for the current chapter and `goto` for navigation.
- Keep all targets ≥ 48px and labels localized.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test:e2e tests/e2e/map.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add home and chapter level map"
```

---

### Task 11: Word Book

**Files:**

- Create: `src/routes/words/+page.svelte`, `src/lib/components/WordChip.svelte`, `tests/e2e/word-book.spec.ts`

**Interfaces:**

- Consumes: `CONTENT[locale]`, `data.locales[locale].unlocked`, `wordKey`, `audio.playWord`.
- Produces: count "{unlocked} of 150", chapter/level grouping, locked chips with "?", unlocked chips that speak the word.

- [ ] **Step 1: Write the failing E2E test**

Seed `localStorage` with a save where English level 1 has words 0 and 1 unlocked. Go to `/en/words`; expect "2 of 150 words"; expect `CAT` and `DOG` visible, `MOUSE` as "?"; click `CAT` and assert the audio element `src` ends with `/en/l01-w1.mp3` (expose `data-audio` on the chip).

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e tests/e2e/word-book.spec.ts`
Expected: FAIL because the screen does not exist.

- [ ] **Step 3: Implement the Word Book**

- Group by chapter, then by level; each level row shows its three chips.
- Locked chips are disabled, show "?" and the level number; unlocked chips show the uppercase word and a speaker.
- Clicking an unlocked chip calls `audio.playWord(locale, level, index)`.
- Add a back button to home and a link to the map.
- The screen reads the current locale's progress only.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test:e2e tests/e2e/word-book.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add per-locale Word Book"
```

---

### Task 12: Settings, language switching, per-locale isolation

**Files:**

- Create: `src/routes/settings/+page.svelte`, `tests/e2e/settings.spec.ts`
- Modify: `src/routes/+layout.svelte`, `src/routes/levels/[level]/+page.svelte`

**Interfaces:**

- Consumes: Paraglide `setLocale`, `getLocale`, `localizeHref`; save `resetLocale`; `currentLevel`, `isLevelOpen`.
- Produces: language list (Română, Italiano, English, Deutsch, Русский), sound toggle, 3-second hold reset for the current locale, about/licenses, "How to play" replay.
- Language switch while on a locked level redirects to that locale's `/levels` with a toast.

- [ ] **Step 1: Write the failing E2E tests**

`tests/e2e/settings.spec.ts`:

- switch from English to Romanian; expect the UI text changes and the URL is `/ro/settings`;
- seed English progress to level 5 and Romanian progress to level 1; switch to Romanian; expect home Play to go to `/ro/levels/1`; switch back to English and expect `/en/levels/5`;
- navigate to `/ro/levels/5` while Romanian is locked; switch to Romanian via settings; expect a redirect to `/ro/levels` and a toast;
- hold reset for 3 seconds; expect the current locale's progress cleared and the other locale untouched.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:e2e tests/e2e/settings.spec.ts`
Expected: FAIL because settings and locale handling do not exist.

- [ ] **Step 3: Implement settings and guards**

- Follow `kids-games-4/src/routes/settings/+page.svelte` for the Paraglide locale switch and persistence.
- In the layout, keep `document.documentElement.lang` and the document title in sync with the active locale.
- Add a small "for grown-ups" label; no gate needed for language, but reset requires a 3s pointer hold with a progress ring.
- Add an About/licenses link (Nunito OFL, generated art/audio, local model credits) and a "How to play" action that reopens the two coach marks on the next level.
- In the level page, on locale change, re-check `isLevelOpen`; if locked, `goto(localizeHref('/levels'))` and show a toast.
- Play a quiet `ui-tap` on each setting change; `muted` persists.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test:e2e tests/e2e/settings.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add settings and per-locale progress isolation"
```

---

### Task 13: Audio runtime, coach marks, install hint, update toast

**Files:**

- Create: `src/lib/audio/index.ts`, `src/lib/audio/index.test.ts`, `src/lib/components/CoachMark.svelte`, `src/lib/components/InstallHint.svelte`, `src/lib/components/UpdateToast.svelte`, `tests/e2e/audio.spec.ts`
- Modify: `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/routes/levels/[level]/+page.svelte`

**Interfaces:**

- `wordAudioPath(locale, level, index): string` → `/audio/words/{locale}/l{02}-w{index}.mp3`;
- `createAudioController(options?): AudioController` with `unlock()`, `setMuted(boolean)`, `playWord(locale, level, index)`, `preloadLevel(locale, level)`, `playSfx(name)`, `playMusic()`, `stopWord()`;
- `export type SfxName = 'tile-pick' | 'tile-place' | 'tile-wrong' | 'ui-tap' | 'bucket-open' | 'word-complete' | 'level-complete' | 'coin'`;
- The layout renders `<audio data-audio="music" loop>` and the word player renders `<audio data-audio="word">` so the E2E can inspect `paused` and `src`.
- Coach marks: two steps (bucket, tile + slot), shown once when `!settings.coachDone`.
- Install hint: shown on home after the first completed level until dismissed.
- Update toast: uses `onUpdateReady`/`applyUpdate`.

- [ ] **Step 1: Write the failing unit tests**

```ts
// src/lib/audio/index.test.ts
import { describe, expect, it } from 'vitest';
import { wordAudioPath } from './index.js';

describe('wordAudioPath', () => {
	it('pads the level and word indexes', () => {
		expect(wordAudioPath('en', 1, 1)).toBe('/audio/words/en/l01-w1.mp3');
		expect(wordAudioPath('ru', 50, 3)).toBe('/audio/words/ru/l50-w3.mp3');
	});
});
```

Add a second test with a fake `Audio` element injected through `createAudioController({ createAudio })`: `playWord` sets the path, calls `play()`, and a second `playWord` pauses the first element. Add a mute test that `setMuted(true)` prevents `play()` and persists the flag.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/audio/index.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the audio controller**

- Use `HTMLAudioElement` for word clips and music; keep one word element, stopping the previous before starting a new one. `preloadLevel(locale, level)` sets `preload="auto"` on the level's three clips; call it when a level opens and preload the next level while idle.
- `unlock()` creates/resumes the elements on the first pointer/key gesture; start the music loop once, at low volume; duck music to 0.25 while a word or SFX plays, restore after.
- `setMuted` persists to the save and stops/starts the music; no audio plays when muted.
- Catch missing-file errors; in development log a content-validation warning.
- SFX paths `/audio/sfx/{name}.mp3`; music `/audio/music/loop.mp3`.
- Call `audio.playSfx('tile-pick')` on tile select, `tile-place` on correct, `tile-wrong` on wrong, `bucket-open` on bucket open, `word-complete` and `level-complete` at the end.

- [ ] **Step 4: Add coach marks, install hint, and update toast**

- Coach marks: step 1 points at bucket 1 ("Tap a bucket"); step 2 points at a tray tile and the empty slot ("Drag the letter, or tap it, then tap the gap"). Dismiss on tap or after the first successful placement; set `coachDone`.
- Install hint: a dismissible card on home after the first cleared level; set `installHintDismissed`.
- Update toast: a small card "A new version is ready" with an update action; never auto-reload.
- Respect reduced motion for all three.

- [ ] **Step 5: Add the E2E test**

`tests/e2e/audio.spec.ts`: mute toggles and persists after reload; coach marks appear on level 1 and not on level 2; install hint appears after clearing a level and stays dismissed. Do not assert real playback here; the real clips arrive in Task 16 and are checked in the Task 18 offline test.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm test src/lib/audio/index.test.ts && pnpm test:e2e tests/e2e/audio.spec.ts`
Expected: PASS.

```bash
git add .
git commit -m "feat: add audio runtime, coach marks, and install hint"
```

---

### Task 14: Art style gate

**Files:**

- Create: `scripts/generate_art.py`, `ART-STYLE.md`, `candidates/` (gitignored)
- Test: visual inspection of three candidates

**Interfaces:**

- `python3 scripts/generate_art.py --style-check` writes three `candidates/style-{1,2,3}.png` for level 1 using three prompt variants.
- `python3 scripts/generate_art.py --all` writes `static/art/levels/l{02}.webp` for all 50 levels, skipping existing files unless `--force`.

- [ ] **Step 1: Write `ART-STYLE.md`**

Record the palette (`#fdf6e9` paper, `#4a3b2f` ink, `#74a72f` leaf, `#e8871f` ochre, `#c64f78` berry, `#a6e0d8` sky), the style target, the fixed prompt template, and the negative prompt `text, letters, words, signage, watermark, scary, sharp teeth, weapons, photorealistic, cluttered`.

Prompt template:

```
Soft cut-paper storybook illustration of {scene}, warm cream background,
rounded simple shapes, muted sage ochre and berry palette, gentle lighting,
centered vignette, child-friendly, cozy, no text, no letters, no people
```

- [ ] **Step 2: Write the art script**

- Add `flux2-klein-mlx-studio/` to `sys.path` via an env var `FLUX_STUDIO` (default `../flux2-klein-mlx-studio`).
- Load `Flux2Klein(model_config=ModelConfig.flux2_klein_4b())` once, then loop:
  `model.generate_image(prompt=..., seed=..., num_inference_steps=4, guidance=1.0, width=1344, height=768)`.
- Save PNG to a temp file, convert to 768×432 WebP quality 80 with `ffmpeg`.
- `--style-check`: three prompt variants for level 1 (`pets`) into `candidates/`.
- `--all`: read the 50 theme prompts from `scripts/themes.json` (written by `pnpm content:export`) so there is one source of truth with `src/lib/content/themes.ts`.
- Fail loudly if the model cannot load; never write placeholders.

- [ ] **Step 3: Generate three candidates and get the human decision**

Run: `python3 scripts/generate_art.py --style-check`
Show the three images to the human partner. They pick one or ask for adjustments. Update `ART-STYLE.md` with the chosen prompt and a reference image.

- [ ] **Step 4: Commit**

```bash
git add ./scripts ./ART-STYLE.md
git commit -m "art: add style guide and FLUX batch generator"
```

---

### Task 15: Generate and integrate the 50 illustrations

**Files:**

- Create: `static/art/levels/l01.webp … l50.webp`, `scripts/contact_sheet.py`, `scripts/validate_assets.mjs`
- Modify: `src/routes/levels/[level]/+page.svelte` (banner `<img>`)

**Interfaces:**

- `getLevelArt(level)` returns `/art/levels/l{02}.webp`; the level screen displays it with `alt=""`, `loading="lazy"`, `decoding="async"`, and the theme name as adjacent text.

- [ ] **Step 1: Generate the batch**

Run: `python3 scripts/generate_art.py --all`
Expected: 50 WebP files, each 768×432, under 90 KB. Re-run to confirm idempotence (skips existing).

- [ ] **Step 2: Build the contact sheet**

Run: `python3 scripts/contact_sheet.py` → `candidates/contact-sheet.png` (5×10 grid with level numbers). Review every image: no text, no scary shapes, consistent palette. Regenerate outliers with `--force --only 7,19,33`.

- [ ] **Step 3: Wire the banner and validate assets**

- Add the banner to the level screen with a soft rounded frame and the theme title.
- `scripts/validate_assets.mjs`: check 50 images exist, are WebP, under 90 KB, and every content word has a clip once Task 16 is done. For now, run with `--images-only`.
- Add `pnpm validate:assets` to package scripts.

- [ ] **Step 4: Run and commit**

Run: `node scripts/validate_assets.mjs --images-only`
Expected: PASS.

```bash
git add ./static/art ./scripts ./src/routes
git commit -m "art: generate and wire the 50 level illustrations"
```

---

### Task 16: Generate and integrate word audio, SFX, and music

**Files:**

- Create: `scripts/generate_audio.mjs`, `static/audio/words/{ro,it,en,de,ru}/l01-w1.mp3 …`, `static/audio/sfx/*.mp3`, `static/audio/music/loop.mp3`
- Modify: `scripts/validate_assets.mjs`

**Interfaces:**

- `generate_audio.mjs` reads `CONTENT` via a generated `scripts/content.json` (one source of truth from `src/lib/content/index.ts`), then writes one clip per word.
- Studio base `http://127.0.0.1:7910`; token from `music-sfx-voice-studio/data/token`; language names `English`, `Italian`, `German`, `Russian`; voice `serena`; instruct "warm, gentle, clear, unhurried, for a young child".
- Romanian Piper voice `ro_RO-mihai-medium` at `PIPER_VOICE` (default `~/piper-voices/ro_RO-mihai-medium.onnx`).

- [ ] **Step 1: Prepare the tools**

- Start the audio studio: `cd music-sfx-voice-studio && .venv/bin/python -m studio` (or the Mac app), confirm `curl http://127.0.0.1:7910/health`.
- Install Piper for the asset job: `python3 -m pip install piper-tts`, download the `ro_RO-mihai-medium` ONNX and config into `~/piper-voices/`.
- Confirm `ffmpeg` is on `PATH`.

- [ ] **Step 2: Write the audio script**

- Run `pnpm content:export` so `scripts/content.json` is current.
- For each locale and word: `POST /voice` with `{ text: spoken ?? word.toLowerCase(), voice: 'serena', instruct: 'warm, gentle, clear, unhurried, for a young child', language }`; on `409 BUSY`, wait `Retry-After` and retry up to 10 times; fetch the returned WAV.
- Romanian: spawn `piper --model "$PIPER_VOICE" --output_file -` with the text, pipe WAV to ffmpeg.
- ffmpeg: `-ac 1 -ar 24000 -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-3" -codec:a libmp3lame -b:a 48k`.
- Write `static/audio/words/{locale}/l{02}-w{i}.mp3`; skip existing unless `--force`; log the text used.
- Generate SFX: `POST /sfx` for `tile-pick`, `tile-place`, `tile-wrong`, `ui-tap`, `coin`; `POST /sfx/text` for `bucket-open` ("wooden bucket lid pop, soft, warm, short"), `word-complete` ("gentle warm chime, short, child-friendly"), and `level-complete` ("small celebratory sparkle flourish, warm, short, not loud"); `POST /music` for a 25s loop ("gentle playful acoustic loop, soft marimba and ukulele, 90 bpm, no vocals, quiet, loopable"). Convert each to MP3 and trim to ≤3s for SFX.

- [ ] **Step 3: Generate a sample and check pronunciation**

Run: `node scripts/generate_audio.mjs --sample`
Expected: one clip per locale, each 0.4–2.5s, non-silent. Listen for Romanian `Ă Â Î Ș Ț`, German `Ä Ö Ü`, Russian `Ё`, and Italian vowels. Add a `spoken` override for any word that is mispronounced.

- [ ] **Step 4: Generate the full batch**

Run: `node scripts/generate_audio.mjs --all`
Expected: 750 word clips + 8 SFX + 1 music loop. Re-run to confirm idempotence.

- [ ] **Step 5: Spot-check and validate**

- Listen to 10 random clips per locale; fix overrides and regenerate those clips.
- Run: `node scripts/validate_assets.mjs` → PASS (all clips exist, 0.2–3s, non-silent, under 10 KB average; images present).
- Show the human partner one clip per locale and the contact sheet; this is the final sample they asked for.

- [ ] **Step 6: Commit**

```bash
git add ./static/audio ./scripts
git commit -m "audio: add 750 word clips, effects, and music"
```

---

### Task 17: Accessibility, reduced motion, visual snapshots

**Files:**

- Modify: `src/lib/components/WordPanel.svelte`, `src/lib/components/Bucket.svelte`, `src/lib/components/LetterTile.svelte`, `src/lib/styles/base.css`, `src/routes/+layout.svelte`
- Create: `tests/visual/app.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:**

- Focus trap in the word panel; focus returns to the opening bucket on close; Escape closes.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables confetti, flying tiles, and looping sparkles; panel transitions become fades.
- All text and glyphs pass AA against their backgrounds; all targets ≥44px.

- [ ] **Step 1: Add the keyboard and screen-reader tests**

`tests/e2e/a11y.spec.ts`:

- Tab to bucket 1, Enter opens the panel; Tab reaches the tray; Enter selects; Tab to a slot; Enter places; Escape closes and focus is on bucket 1.
- The live region announces "Letter placed" and "Word complete" (read `aria-live` text).
- With `prefers-reduced-motion: reduce`, the panel has no transform animation (assert the computed `transition-duration` is `0s` or the animation class is absent).

- [ ] **Step 2: Add visual snapshots**

`tests/visual/app.spec.ts`: for `en`, `ro`, `ru`, screenshot home, level 1, an open word panel, level complete, and the Word Book. Use a seeded save for the complete/Word Book states. Generate baselines with `pnpm test:visual --update-snapshots`; inspect for glyph tofu, overflow, and contrast.

- [ ] **Step 3: Fix what the tests and snapshots find**

- Adjust tile sizes with `clamp()` so a 6-letter word fits 320px width.
- Ensure the longest German/Romanian strings wrap without clipping.
- Add `aria-label`s where the icon-only controls lack them.
- Add `alt=""` to decorative illustrations; the theme title is real text.

- [ ] **Step 4: Run and commit**

Run: `pnpm test:e2e tests/e2e/a11y.spec.ts && pnpm test:visual`
Expected: PASS.

```bash
git add .
git commit -m "a11y: add keyboard flow, reduced motion, and visual snapshots"
```

---

### Task 18: Offline E2E, CI, size budget, release

**Files:**

- Create: `tests/e2e/offline.spec.ts`, `scripts/check_build_size.mjs`, `.github/workflows/ci.yml`, `README.md`, `LICENSE`, `vercel.json`
- Modify: `package.json` (CI scripts), `playwright.config.ts`

**Interfaces:**

- Offline test: install the service worker, set the browser offline, reload, see home, fetch a word clip and a level image, expect 200.
- Build size check: 750 clips + 50 images + app shell < 20 MB; fails with a list of the largest files on overflow.
- CI: install, lint, check, unit tests, build, E2E; visual tests are local-only.

- [ ] **Step 1: Write the failing offline E2E test**

```ts
// tests/e2e/offline.spec.ts
import { expect, test } from '@playwright/test';

test('works offline after install', async ({ page, context }) => {
	await page.goto('/en/');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: /letter buckets/i })).toBeVisible();
	const audio = await page.evaluate(async () => (await fetch('/audio/words/en/l01-w1.mp3')).status);
	const image = await page.evaluate(async () => (await fetch('/art/levels/l01.webp')).status);
	expect(audio).toBe(200);
	expect(image).toBe(200);
});
```

- [ ] **Step 2: Run it to verify it fails or exposes a cache hole**

Run: `pnpm test:e2e tests/e2e/offline.spec.ts`
Expected: initially FAIL if audio is not precached or the navigation path is wrong. Fix the service worker (not the test) until it passes.

- [ ] **Step 3: Add the size check and CI**

`scripts/check_build_size.mjs`: sum `build/**` bytes; assert <20 MB; assert exactly 50 images and 750 word clips; print the top 10 largest files.

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 12 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
      - run: node scripts/check_build_size.mjs
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

- [ ] **Step 4: Write the README, license, and deploy config**

- README: what the game is, the five languages, the offline/PWA promise, how to run, how the puzzle works, how to regenerate art/audio (studio paths and review gates), credits, and the 20 MB budget.
- `LICENSE`: MIT for the code; a credits section for Nunito (OFL), generated art/audio, and the local models.
- `vercel.json`: SPA rewrite all paths to `/200.html`.
- Add `pnpm size` and `pnpm assets:art`/`pnpm assets:audio` scripts.

- [ ] **Step 5: Full verification**

Run: `pnpm lint && pnpm check && pnpm test && pnpm build && node scripts/check_build_size.mjs && pnpm test:e2e`
Expected: all pass; offline test passes; size under 20 MB.

Then run a mobile Lighthouse audit against the preview (`pnpm dlx lighthouse http://127.0.0.1:4173/en/ --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices`). Record the scores in the README; fix performance below 90 or accessibility below 95 before release.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: add offline test, CI, size budget, and release docs"
```

---

## Self-Review

- **Spec coverage:** every section maps to a task — shell (1), PWA (2), content (3), puzzle (4), save (5), UI primitives (6), level flow (7–9), map/home (10), Word Book (11), settings/locales (12), audio/coach marks (13), art (14–15), audio batch (16), accessibility (17), offline/CI/release (18).
- **Placeholders:** no placeholder assets are committed. Missing images/audio are tolerated only during local development before Tasks 15–16; the release build validation rejects them.
- **Type consistency:** `PuzzleSpec`, `PuzzleState`, `PlaceOutcome`, `LevelSession`, `SaveData`, `LocaleProgress`, `wordAudioPath`, and `getLevelArt` are defined once and reused with the same names.
- **Review Focus:** each of the five failure modes has a named test in its owning task.
- **Proportion:** the plan specifies signatures, test names, and exact values; it leaves implementation bodies to the builder except where the algorithm or the copy is the decision.
