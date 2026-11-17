# Manifest order is documented as clues-then-clips but interleaves them

- **Severity:** low
- **Area:** docs
- **Location:** `scripts/build_manifest.mjs:47`
- **Confidence:** certain

## What happens

The manifest builder's own header, the README and the design all say a level is ordered "illustration, then its three clues, then its three clips". The code pushes each clue immediately followed by its clip, so the three ships with a different order than every document describing it. Anyone writing an ordering test or reasoning about which files a child has before the level opens will encode the wrong sequence.

## Evidence

```js
// scripts/build_manifest.mjs:3-5
// Each manifest lists the files that actually exist on disk, ordered per level:
// the level illustration first, then its three clues, then its three clips. The
// app downloads them in that order so the next level is ready before it opens.
```

```js
// scripts/build_manifest.mjs:47-56
for (let index = 0; index < level.words.length; index++) {
	const clue = `/art/${pkg.art}words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
	const clip = `/audio/${pkg.audio}words/${locale}/${voiceFolder(locale, voice.id)}l${pad(level.id)}-w${index + 1}.mp3`;
	for (const asset of [clue, clip]) {
		const file = `${root}${asset}`;
		if (existsSync(file)) {
			files.push({ path: asset, bytes: statSync(file).size, level: level.id });
		}
	}
}
```

The generated manifest shows the real order — clue, clip, clue, clip:

```
/art/levels/l01.webp
/art/words/en/l01-w1.webp
/audio/words/en/l01-w1.mp3
/art/words/en/l01-w2.webp
/audio/words/en/l01-w2.mp3
/art/words/en/l01-w3.webp
/audio/words/en/l01-w3.mp3
/art/levels/l02.webp
```

Same claim in `README.md:61-62` ("level _n_ illustration, its three clues, its three clips, then level _n+1_") and `…-package-downloads-design.md:45-47` ("ordered per level: level art, its three clues, its three clips"). With `CONCURRENCY = 3`, the first batch is plate + clue 1 + clip 1, so the behaviour diverges from the stated intent, not just the wording.

## Suggested fix

Pick the intent and make the code match. If clues-then-clips is wanted:

```js
const levelFiles = [];
if (existsSync(plate)) levelFiles.push(plateEntry);
for (const word of words) levelFiles.push(clueEntry);
for (const word of words) levelFiles.push(clipEntry);
files.push(...levelFiles);
```

If interleaving is wanted (a word is fully playable sooner), change the three documents to say "each clue followed by its clip" and use that sentence in the header comment.

## Test

Add a unit check beside the builder or in `tests/`: read `static/manifests/p1/en/default.json` and assert `files.slice(0, 7)` equals the documented sequence. It fails today and pins whichever choice is made.
