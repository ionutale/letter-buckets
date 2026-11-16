# Letter Buckets

A calm, offline word game for children aged 4–8, in **Romanian, Italian, English, German, and Russian**.

Each level is a place with **three buckets**. Tap a bucket to open its word: some letters are already in place, the missing ones are empty slots, and the tray below holds the missing letter tiles. Drag a tile into a slot — or tap the tile and then the slot — until the word is complete. All three completed words unlock the level and add their words to the Word Book.

50 levels · 5 chapters · 150 words per language · a clue image for every bucket · no timers · no losing · no ads · no tracking.

## Play

- Live: <https://letter-buckets.pages.dev>
- Source: <https://github.com/ionutale/letter-buckets>

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints. The device language is detected; the five languages are in Settings.

## Build, test, and preview

```bash
pnpm check        # svelte-check
pnpm test         # Vitest unit and component tests
pnpm build        # static SPA in build/
pnpm preview      # serves build/ with the 200.html SPA fallback
pnpm test:e2e     # Playwright: desktop + Pixel 7
pnpm test:visual  # macOS visual baselines, Chromium only
```

`pnpm preview` runs `scripts/serve-preview.mjs` so client-side routes resolve to `200.html`. Vercel does the same through `vercel.json`.

Cloudflare Pages deploys `build/` directly:

```bash
pnpm dlx wrangler@latest pages deploy build --project-name letter-buckets --branch main
```

`pnpm build` also runs `scripts/spa-fallback.mjs`, which copies the `200.html` shell to `index.html` — Pages serves `index.html` for unknown paths, so deep links and locale routes work without a redirect rule.

## Languages

Romanian, Italian, English, German, Russian. UI copy, theme names, word lists, and word audio are all localized. Progress, unlocked words, and chapter stamps are stored **per language**, so switching language never erases another language's progress.

## Assets

All art and audio are generated once and committed; the app makes no runtime model calls and has no third-party requests.

- **Word audio:** Qwen3-TTS (via `music-sfx-voice-studio`) for English and German; Piper `ro_RO-mihai-medium` for Romanian and `ru_RU-irina-medium` for Russian. Italian uses the engine's designed native voice `narratrice-a`, cloned from an Italian reference, because Qwen's fixed presets carry an audible foreign accent.
- **Effects and music:** Stable Audio 3 and the studio's procedural effects.
- **Illustrations:** 50 theme images and 750 per-word clue icons, FLUX.2-klein through mflux, layered-paper direction.

Regenerate:

```bash
pnpm content:export                         # content.json, content.p2.json, content.p3.json, themes.json
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --all
node scripts/generate_audio.mjs --all       # starts from the local studio; see below
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --all
node scripts/validate_assets.mjs            # 50 theme images, 750 word clues, 750 clips, effects, music
node scripts/validate_assets.mjs --packages # also checks packages 2 and 3
```

The audio job generates every package by default. Narrow it with `--package p2`
and `--locale it`, and add `--force` to overwrite clips that already exist.
Output goes to `static/audio/words/…` for Package 1 and `static/audio/p2/words/…`,
`static/audio/p3/words/…` for the others.

`PIPER_BIN` can point at the local Piper virtualenv, for example
`PIPER_BIN="$PWD/.venv-piper/bin/piper" node scripts/generate_audio.mjs --all`.

The audio job expects the studio at `http://127.0.0.1:7910` with its token in `../music-sfx-voice-studio/data/token`, and Piper installed with the Romanian voice at `~/piper-voices/ro_RO-mihai-medium.onnx` and the Russian voice at `~/piper-voices/ru_RU-irina-medium.onnx`. It retries `409 BUSY` from the shared GPU. The art job expects the FLUX studio's Python environment and downloaded FLUX.2-klein weights.

The word lists are reviewed before the audio batch. The art direction is reviewed through three candidates in `candidates/`. The review gates are in `docs/superpowers/plans/2026-11-12-letter-buckets.md`.

## Privacy

- Everything runs on the device.
- No accounts, analytics, trackers, or server.
- The only network request is the browser fetching an updated app shell.
- All progress is in `localStorage` under `letter-buckets-save`.
- Reset progress lives in Settings behind a three-second hold and clears only the current language.

## Structure

```
src/lib/content/     typed 50-level word lists, rules, and validation
src/lib/game/        pure puzzle engine, hint chain, level session
src/lib/storage/     versioned per-locale save
src/lib/audio/       clip playback, mute, ducking, preloading
src/lib/components/  buckets, tiles, word panel, coach marks, UI
src/routes/          home, level map, level, Word Book, settings
src/service-worker.ts  cache-first app shell and all assets
scripts/             art, audio, validation, icons, size budget
```

## Credits

Nunito (SIL Open Font License). Illustrations and audio generated locally with FLUX.2-klein, Qwen3-TTS, Piper, and Stable Audio 3. No third-party runtime assets.
