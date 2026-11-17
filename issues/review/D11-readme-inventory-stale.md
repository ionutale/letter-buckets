# README inventory and install size are stale after packages 2 and 3

- **Severity:** low
- **Area:** docs
- **Location:** `README.md:52`
- **Confidence:** certain

## What happens

Three figures in the README describe the single-package game: 50 levels and 150 words per language, 50 theme images and 750 clue icons, and an install of "around 12 MB". The repository now ships three packages, and none of the numbers match what the asset pipeline produces or what a browser stores.

## Evidence

```md
<!-- README.md:7 -->

50 levels · 5 chapters · 150 words per language · ...
```

```
<!-- README.md:52 -->
- **Illustrations:** 50 theme images and 750 per-word clue icons, FLUX.2-klein through mflux, layered-paper direction.
```

```
<!-- README.md:54-55 -->
Only the default Italian narrator is precached for offline use. The other four
are cached the first time one is played, so the install stays around 12 MB.
```

Measured in this tree: `static/art/levels` holds 50 plates, `static/art/p2/levels` 50 and `static/art/p3/levels` 50; each of the five locales has 150 clues per package, so 2,250 clue icons. `pnpm build` is 27.12 MB (`node scripts/check_build_size.mjs`), and a player who has finished all three packages in Italian with the default narrator holds 1,395,313 bytes of shell plus 1,445,958 + 1,511,464 + 1,564,970 bytes of assets (the manifest `total` fields) ≈ 5.9 MB. The "12 MB" figure matches neither the deploy nor a cache, and it directly contradicts `README.md:59` ("about 0.85 MB") twelve lines above it.

The sentence is also wrong about precaching: after the progressive-download change no narrator's clips are precached at all; the default narrator's clips are _downloaded_ by the queue (`src/lib/pwa/downloads.svelte.ts`), and alternates are cached only when played (`tests/e2e/voice-offline.spec.ts`).

## Suggested fix

Restate the numbers from the current tree, or make them generated: 150 levels / 450 words per language (three packages of 50), 150 level plates and 2,250 clue icons, and drop the 12 MB sentence in favour of the measured shell size plus "the rest arrives with the download queue".

## Test

Not a test: add a line to `issues/05-release-validation.md` recording the measured build size and the number of plates/clues per package, so the README figures can be checked against a fresh `pnpm build` at review time.
