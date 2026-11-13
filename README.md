# Letter Buckets

A calm, offline word game for children aged 4–8, in **Romanian, Italian, English, German, and Russian**.

Each level is a place with **three buckets**. Tap a bucket to open its word: some letters are already in place, the missing ones are empty slots, and the tray below holds the missing letter tiles. Drag a tile into a slot — or tap the tile and then the slot — until the word is complete. All three completed words unlock the level and add their words to the Word Book.

50 levels · 5 chapters · 150 words per language · no timers · no losing · no ads · no tracking.

## Play

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

## Languages

Romanian, Italian, English, German, Russian. UI copy, theme names, word lists, and word audio are all localized. Progress, unlocked words, and chapter stamps are stored **per language**, so switching language never erases another language's progress.

## Assets

All art and audio are generated once and committed; the app makes no runtime model calls and has no third-party requests.

- **Word audio:** Qwen3-TTS (via `music-sfx-voice-studio`) for English, Italian, German, and Russian; Piper `ro_RO-mihai-medium` for Romanian.
- **Effects and music:** Stable Audio 3 and the studio's procedural effects.
- **Illustrations:** FLUX.2-klein 4B through mflux, layered-paper direction.

Regenerate:

```bash
pnpm content:export                         # scripts/content.json + scripts/themes.json
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --all
node scripts/generate_audio.mjs --all       # starts from the local studio; see below
node scripts/validate_assets.mjs            # 50 images, 750 clips, effects, music
```

The audio job expects the studio at `http://127.0.0.1:7910` with its token in `../music-sfx-voice-studio/data/token`, and Piper installed with the voice at `~/piper-voices/ro_RO-mihai-medium.onnx`. It retries `409 BUSY` from the shared GPU. The art job expects the FLUX studio's Python environment and downloaded FLUX.2-klein weights.

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
