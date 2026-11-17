# Manifest builder neither verifies nor reports the files it drops

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/build_manifest.mjs:50`
- **Confidence:** certain

## What happens

`build_manifest.mjs` silently omits every asset it cannot find and reports success. There is no expected count, no per-manifest total and not a single warning, so an interrupted `assets:audio` or `assets:art` run produces a manifest of 349 files instead of 350, or no manifest at all for a package, and nothing in `pnpm build` distinguishes that from a complete one. Downstream, a short manifest is treated as the full package (the app's own "non-OK manifest means complete" bug is reported separately in A06), so the missing file is never queued, cached or retried.

## Evidence

```js
// scripts/build_manifest.mjs:47-58
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

```js
// scripts/build_manifest.mjs:58-68
if (files.length === 0) continue;

const total = files.reduce((sum, file) => sum + file.bytes, 0);
...
writeFileSync(resolve(dir, `${key}.json`), JSON.stringify({ package: pkg.id, locale, voice: key, total, files }));
written.push(`${pkg.id}/${locale}/${key}`);
```

A complete manifest holds exactly 350 entries (50 plates + 150 clues + 150 clips); all 27 manifests on disk confirm it. Nothing asserts that, and the final log line counts manifests, not files:

```js
console.log(`wrote ${written.length} manifests under static/manifests`);
```

so `wrote 27 manifests` is printed whether the run encoded every clip or only the first level of each. The header comment (`scripts/build_manifest.mjs:3-5`) presents the file as an inventory of "the files that actually exist", which is why the absence of a completeness check is easy to miss; but a manifest that exists is consumed as the authoritative list for a package.

## Suggested fix

Assert and report per manifest, and fail the build when a package with content yields nothing:

```js
let missing = 0;
...
} else {
	missing += 1;
	console.error(`missing ${asset}`);
}
...
if (missing > 0) {
	console.error(`${pkg.id}/${locale}/${voice.id}: ${missing} of ${expected} files missing`);
	process.exitCode = 1;
}
```

with `const expected = level.words.length * 2 + 1` per level accumulated across the package. Keep the exit non-zero even if the manifest is still written, so `prebuild` fails loudly.

## Test

`mv static/audio/words/en/l12-w2.mp3 /tmp`, run `node scripts/build_manifest.mjs`, and assert a non-zero exit plus `missing /audio/words/en/l12-w2.mp3`. Restore the file and confirm a clean exit with `wrote 27 manifests` and no missing lines.
