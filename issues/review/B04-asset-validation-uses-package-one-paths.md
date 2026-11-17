# `validateContent({ requireAssets })` checks Package 1 asset paths for every package, so Package 2 and 3 could ship with no clips or banners

- **Severity:** low
- **Area:** content
- **Location:** `src/lib/content/validate.ts:126-152`
- **Confidence:** certain

## What happens

`validateContent` is package-unaware: the audio clip, word clue and level banner paths it probes are hard-coded to the Package 1 layout (`audio/words/...`, `art/words/...`, `art/levels/...`). Package 2 and Package 3 assets live under `audio/p2/words/...`, `art/p2/words/...`, `art/p2/levels/...` (see `getWordArt`/`getLevelArt` in `src/lib/content/index.ts:54-69`). Calling the release check on `PACKAGE_2` or `PACKAGE_3` therefore verifies the files that already exist for Package 1 and reports no issues even if every Package 2/3 clip and banner is missing — exactly the failure mode the check exists to prevent (spec: "the release build fails content validation unless all 750 clips, 50 theme illustrations, and 750 word clues are present").

## Evidence

```ts
// src/lib/content/validate.ts:20-24
const PROJECT_ROOT = new URL('../../../', import.meta.url);
function assetPath(relative: string): string {
	return fileURLToPath(new URL(`static/${relative}`, PROJECT_ROOT));
}
...
// :126
if (options.requireAssets) {
	const clip = assetPath(`audio/words/${locale}/l${pad(level.id)}-w${wordIndex + 1}.mp3`);
	if (!existsSync(clip)) { ... }
	const clue = assetPath(`art/words/${locale}/l${pad(level.id)}-w${wordIndex + 1}.webp`);
	if (!existsSync(clue)) { ... }
}
...
// :149
const art = assetPath(`art/levels/l${pad(level.id)}.webp`);
```

There is no `packageId` parameter or `p2/`/`p3/` segment anywhere in the function, yet the test suite already calls it for the other packages (`src/lib/content/validate.test.ts:10,13`), which reads as a real release gate. The package-aware check exists only as a separate script (`scripts/validate_assets.mjs --packages`), so the library API silently disagrees with it. Verify with the current tree: `static/audio/p2/words/en/l01-w1.mp3` and `static/audio/words/en/l01-w1.mp3` are different files, and only the second is ever probed.

## Suggested fix

Thread the package through: `validateContent(content, { packageId?: PackageId, requireAssets?: boolean })` and build the folder with the same rule as `getWordArt`/`getLevelArt` (`p2/` → `art/p2/...`, `audio/p2/words/...`), or reuse `getWordArt`/`getLevelArt` plus a `getWordClip` helper so the validator can never diverge from the runtime paths.

## Test

```ts
it('checks package 2 asset paths, not package 1', () => {
	const issues = validateContent(PACKAGE_2, { packageId: 'p2', requireAssets: true });
	expect(issues.some((i) => i.message.includes('audio/p2/words/'))).toBe(true);
});
```

with a fixture whose p2 clip is renamed away. A cheaper regression guard: assert the computed path for a missing p2 clue ends with `art/p2/words/en/l01-w1.webp`.
