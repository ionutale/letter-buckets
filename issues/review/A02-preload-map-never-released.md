# Preloaded clips are never released, so media elements accumulate for the whole session

- **Severity:** medium
- **Area:** audio
- **Location:** `src/lib/audio/index.ts:78` (`preloads`), `src/lib/audio/index.ts:309-317` (`warm`), `src/lib/audio/index.ts:319-334` (`preloadLevel`), entries only removed by `playWord` at `src/lib/audio/index.ts:294-295`
- **Confidence:** certain

## What happens

The controller keeps a module-lifetime `Map` of "warm" `HTMLAudioElement`s keyed by URL. `preloadLevel` adds three entries per level view and `warm` adds one entry per word that finished playing (re-adding the path that `playWord` just consumed), and nothing ever evicts an entry that is no longer needed. Each retained element keeps its `src` and buffered media resource alive. A 50-level playthrough therefore leaves roughly 3 elements per visited level alive (the two clips that were never played plus the re-warmed one), multiplied again by every language/voice/package combination previewed. The controller is the module singleton (`export const audio = createAudioController()`), so this memory is never released for the lifetime of the page.

## Evidence

```ts
// src/lib/audio/index.ts:78
const preloads = new Map<string, HTMLAudioElement>();
```

`playWord` is the only place that removes an entry, and it immediately allows another one to be recreated:

```ts
// src/lib/audio/index.ts:290-306
const path = wordAudioPath(locale, level, index, packageId, voice);
const preloaded = preloads.get(path);
preloads.delete(path);              // consumed
const audio = preloaded ?? make();
...
audio.addEventListener('ended', () => {
	restoreMusic();
	warm(path);                      // re-adds the same path
});
```

```ts
// src/lib/audio/index.ts:309
function warm(path: string): void {
	if (preloads.has(path) || muted) return;
	const audio = make();
	audio.preload = 'auto';
	audio.volume = 0;
	audio.src = path;
	preloads.set(path, audio);
}
// src/lib/audio/index.ts:319
function preloadLevel(...): void {
	for (let index = 0; index < 3; index++) {
		const path = wordAudioPath(locale, level, index, packageId, voice);
		if (preloads.has(path)) continue;
		...
		preloads.set(path, audio);
	}
}
```

There is no `preloads.delete` for stale levels, no `src = ''` + `load()` release, and no cap. Both call sites (`src/routes/levels/[level]/+page.svelte:61` and `:81`) run on every level navigation, and `warm` runs after every word — so the map only grows within a session, in a game that is played continuously for tens of levels on memory-constrained phones.

## Suggested fix

Bound the warm set to the level currently in play and explicitly release what is dropped:

```ts
function release(audio: HTMLAudioElement): void {
	audio.removeAttribute('src');
	audio.load();       // aborts the network/media resource
}

function preloadLevel(locale: string, level: number, packageId: PackageId = 'p1', voice = DEFAULT_VOICE): void {
	const wanted = [0, 1, 2].map((i) => wordAudioPath(locale, level, i, packageId, voice));
	for (const [path, audio] of preloads) {
		if (wanted.includes(path)) continue;
		release(audio);
		preloads.delete(path);
	}
	for (const path of wanted) {
		if (preloads.has(path)) continue;
		const audio = make();
		audio.preload = 'auto';
		audio.volume = 0;
		audio.src = path;
		preloads.set(path, audio);
	}
}
```

and make `warm` a no-op when the path does not belong to the current level (store the current level's three paths in a module variable), or cap the map (`if (preloads.size > 3) { evict oldest }`).

## Test

Unit test with the existing `FakeAudio` plus a `load` spy in the client project:

```ts
controller.preloadLevel('en', 1);
expect(created).toHaveLength(3);
controller.preloadLevel('en', 2);
const level1 = created.filter((a) => a.src.includes('/l01-'));
expect(level1).toHaveLength(3);
expect(level1.every((a) => a.load.mock.calls.length >= 1)).toBe(true);   // released, not leaked
expect(created.filter((a) => a.src !== '').length).toBe(3);              // only the current level stays warm
```

Today the `load` assertion fails and six elements keep a `src`.
