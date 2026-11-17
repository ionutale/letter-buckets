# `static/.DS_Store` is published and precached by the service worker

- **Severity:** low
- **Area:** service-worker
- **Location:** `src/service-worker.ts:17-20` (precache = every file from `$app/manifest`'s `assets`, filtered only for art/audio), `static/.DS_Store`
- **Confidence:** certain

## What happens

The precache list is built from `assets`, i.e. **every** file in `static/`, with only art and audio removed. A macOS `.DS_Store` (6 148 bytes, the Finder metadata blob from `src/`) is committed under `static/`, so it is copied into the build, served publicly at `/.DS_Store`, and cached by the install handler on every client. It also makes the SW's precache list depend on whatever stray files happen to be in `static/` — the next one could be a backup file or an editor artefact.

## Evidence

```ts
// src/service-worker.ts:17
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
].filter((path) => !isDownloadedAsset(path));
```

`isDownloadedAsset` only excludes `/art/` and `/audio/` (`src/lib/pwa/policy.ts:38-44`); dotfiles pass through. The current build proves it:

```
$ ls -la static/.DS_Store build/.DS_Store
-rw-r--r--@ 1 ... 6148 ... static/.DS_Store
-rw-r--r--  1 ... 6148 ... build/.DS_Store

$ grep -o 't=\[{path:`.DS_Store`' build/service-worker.js
t=[{path:`.DS_Store`},...
```

So `build/service-worker.js` precaches `/.DS_Store` during install (one wasted request per install, and a publicly reachable macOS metadata file).

## Suggested fix

1. Remove the file and prevent it coming back: `rm static/.DS_Store src/.DS_Store`, add `.DS_Store` to `.gitignore`, and delete it from the index (`git rm --cached static/.DS_Store`).
2. Make the precache explicit instead of "everything in static/":

```ts
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets
		.map((asset) => resolve(asset.path))
		.filter((path) => !isDownloadedAsset(path))
		.filter((path) => !/\/\.[^/]+$/.test(path)) // no dotfiles
		.filter((path) => !/\.(map|txt|md|bak)$/i.test(path))
];
```

## Test

Build-time assertion (fits `scripts/validate_assets.mjs`, which already runs in the release checklist):

```js
const sw = fs.readFileSync('build/service-worker.js', 'utf8');
assert(!sw.includes('.DS_Store'), 'service worker must not precache .DS_Store');
assert(!fs.existsSync('build/.DS_Store'), 'static dotfiles must not be published');
```

It fails on the current build.
