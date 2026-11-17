# Letter Buckets

A calm, offline word game for children aged 4–8, in **Romanian, Italian, English, German, and Russian**.

Each level is a place with **three buckets**. Tap a bucket to open its word: some letters are already in place, the missing ones are empty slots, and the tray below holds the missing letter tiles. Drag a tile into a slot — or tap the tile and then the slot — until the word is complete. All three completed words unlock the level and add their words to the Word Book.

150 levels in three packages · 5 chapters each · 450 words per language · a clue image for every bucket · no timers · no losing · no ads · no tracking.

Packages open in order: completing all 50 levels of one unlocks the next.

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

- **Word audio:** Qwen3-TTS (via `music-sfx-voice-studio`) for English and German; Piper `ro_RO-mihai-medium` for Romanian and `ru_RU-irina-medium` for Russian. Italian has five designed native narrators (`narratrice`, `chiara`, `marco`, `lucia`, `giovane`), selectable in Settings under Voce; `narratrice` is the default.
- **Effects and music:** Stable Audio 3 and the studio's procedural effects.
- **Illustrations:** 150 theme images (50 per package) and 2,250 per-word clue icons (750 per package), FLUX.2-klein through mflux, layered-paper direction.

No narrator's word clips are precached. The download queue fetches the active
language and narrator after install; the other Italian narrators are cached the
first time one is played.

## Progressive downloads

A first install carries the shell only — about **1.0 MB**: app code, fonts,
icons, UI sounds and the music loop. Level art, word clues and word clips
download after that, in level order: the level _n_ illustration, then each clue
followed by its own clip, then level _n+1_. The queue starts from the level the
player is on, runs forward to level 50, then fills earlier gaps. Packages 2 and 3
join the queue only once they unlock.

A slim progress bar pinned to the top reports the queue. It never blocks play:
a missing file simply streams in when requested. The queue is restarted on
`online` and after a level completes.

`scripts/build_manifest.mjs` writes one manifest per package, language and
narrator under `static/manifests/`, listing the files that exist and their byte
sizes. Each manifest is expected to hold 350 files (50 plates, 150 clues, 150
clips); a missing file is reported and fails `pnpm build` instead of publishing
a short manifest. `pnpm build` regenerates them through `prebuild`.

Downloads write into the same versioned cache the service worker reads, so a
finished queue is also the offline copy. Because each deploy opens a fresh
cache, the offline guarantee covers the language and narrator actually in use,
not all five languages.

Regenerate:

```bash
pnpm content:export                         # content.json, content.p2.json, content.p3.json, themes.json
python3 scripts/build_word_glosses.py       # word_glosses.json from the reviewed translations
pnpm manifests                              # static/manifests/<package>/<locale>/<voice>.json
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --all
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --package p2 --all
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --package p3 --all
node scripts/generate_audio.mjs --all       # starts from the local studio; see below
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --all
/Users/ionutale/developer-playground/flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --package p2 --all
python3 scripts/contact_sheet.py --package p2      # level sheet in candidates/
node scripts/contact_sheet.mjs --package p2 it      # clue sheet per language in /tmp
node scripts/validate_assets.mjs            # 50 plates, 750 clues, 1,350 clips (incl. 600 alternate Italian narrations), effects, music, theme prompts
node scripts/validate_assets.mjs --packages # all three packages: 150 plates, 2,250 clues, 4,050 clips
```

`generate_word_art.py` refuses to run when a Package 2 or 3 gloss is missing
(Package 1 keeps its original, unserialised keys) and exits non-zero when the
selection produced nothing, so an out-of-date gloss file or a wrong filter
cannot look like a successful batch. `build_word_glosses.py` warns when a
package content export is absent and leaves its keys out.

The audio job generates every package whose content export exists, so run
`pnpm content:export` first. Narrow it with `--package p2`, `--locale it` and
`--voice chiara`, and add `--force` to overwrite clips that already exist.
Output goes to `static/audio/words/…` for Package 1 and
`static/audio/p2/words/…`, `static/audio/p3/words/…` for the others. Italian
alternates get a voice segment, for example
`static/audio/words/it/chiara/l01-w1.mp3`.

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
