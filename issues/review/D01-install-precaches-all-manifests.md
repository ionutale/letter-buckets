# First install precaches all 27 download manifests, 43% of the shell

- **Severity:** high
- **Area:** docs
- **Location:** `README.md:59`
- **Confidence:** certain

## What happens

Both the README and the design doc promise a first install of about 0.8–0.85 MB made of app code, fonts, icons, UI sounds and music, but the service worker precaches every package/locale/narrator manifest (27 files, 605,561 bytes), so the real install is 1,395,313 bytes (1.33 MiB). The headline number of the whole progressive-download feature is wrong by 65%, and every visitor downloads file lists for languages and narrators they will never use.

## Evidence

`README.md:59` says "A first install carries the shell only — about **0.85 MB**: app code, fonts, icons, UI sounds and the music loop", and `docs/superpowers/specs/2026-11-17-package-downloads-design.md:42-44` says the precache "shrinks to the shell: `immutable` assets, icons, manifest, `200.html`, UI sounds and the music loop".

The precache is built by filtering the SvelteKit asset list through `isDownloadedAsset`:

```js
// src/service-worker.ts:17-20
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
].filter((path) => !isDownloadedAsset(path));
```

```js
// src/lib/pwa/policy.ts:38-44
export function isDownloadedAsset(path: string): boolean {
	const full = path.startsWith('/') ? path : `/${path}`;
	if (full.startsWith('/audio/sfx/') || full.startsWith('/audio/music/')) return false;
	return full.startsWith('/art/') || full.startsWith('/audio/');
}
```

`static/manifests/*` is produced by `scripts/build_manifest.mjs` into the static tree, so it appears in `assets` and `isDownloadedAsset('/manifests/p1/it/chiara.json')` is `false`; the filter therefore keeps it. Parsing the two asset arrays out of the built `build/service-worker.js` gives 107 precache entries and 27 of them are `manifests/...json`. Summing the files on disk: 1,395,313 bytes total, of which 605,561 bytes are manifests. Without the manifests the precache is 789,752 bytes, which is exactly the 0.8 MB the doc claims.

The unit test that pins this filter enumerates art, word audio, sfx, music and icons but never mentions `/manifests/`, so the regression is invisible in `pnpm test`:

```ts
// src/lib/pwa/policy.test.ts:50-62
it('leaves art and word audio to the progressive downloader', () => {
	expect(isDownloadedAsset('/art/levels/l01.webp')).toBe(true);
	...
	expect(isDownloadedAsset('/icons/apple-touch-icon.png')).toBe(false);
```

## Suggested fix

Decide one way and make it consistent. If manifests should not be precached, add them to the exclusion:

```js
if (full.startsWith('/manifests/')) return false;
```

and give the downloader's `fetch('/manifests/...')` a lane: either add `/manifests/` to `CACHE_FIRST_PREFIXES` in `src/lib/pwa/policy.ts:12` so the ~23 KB manifest of the active package is cached on first use, or accept a network fetch per visit. Then correct the 0.85 MB figure in `README.md:59` and `…-package-downloads-design.md:15` to whatever the measured precache is. If manifests are meant to be precached, fix the two documents instead and say so.

## Test

Add to `src/lib/pwa/policy.test.ts`:

```ts
expect(isDownloadedAsset('/manifests/p1/en/default.json')).toBe(true);
```

and a size assertion that fails on regression, for example in `scripts/check_build_size.mjs` (see D05). Manual check: `node -e` over `build/service-worker.js` asset arrays must not contain `manifests/`, and the precache sum must be under 0.9 MB.
