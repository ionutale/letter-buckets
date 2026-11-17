# "In level order" download test asserts no order

- **Severity:** medium
- **Area:** test
- **Location:** `tests/e2e/downloads.spec.ts:33`
- **Confidence:** certain

## What happens

The test named "a first visit downloads package one in level order behind a progress bar" never looks at order. It asserts how many paths ended up in the cache, which is identical whether the queue runs level 1→50, 50→1, or in manifest order for a player sitting at level 20. The central decision of the design ("Order is current level first, then forward to 50, then any earlier gaps") has no test at all.

## Evidence

```ts
// tests/e2e/downloads.spec.ts:43-48
const paths = await cachedPaths(page);
expect(paths).toContain('/art/levels/l01.webp');
expect(paths).toContain('/audio/words/en/l01-w1.mp3');
expect(paths.filter((path) => path.startsWith('/art/levels/'))).toHaveLength(50);
expect(paths.filter((path) => path.startsWith('/audio/words/en/'))).toHaveLength(150);
expect(paths.filter((path) => path.startsWith('/audio/p2/'))).toHaveLength(0);
```

`cachedPaths` already returns cache keys in insertion order (`Cache.keys()`), so the data needed for an ordering assertion is in hand and simply unused. Nothing in `tests/` seeds a save at a mid-game level and checks that level _n_ is fetched first; `downloads.spec.ts:55` and `:71` only exercise unlocked/locked packages. A regression that ignores `startLevel` in `byLevel` (`src/lib/pwa/downloads.svelte.ts:98-100`) or that sorts the manifest alphabetically would pass the whole suite.

## Suggested fix

Assert the first tier and the wrap-around, tolerating the order inside a concurrency-3 batch:

```ts
const imgs = paths.filter((p) => p.startsWith('/art/levels/'));
expect(new Set(imgs.slice(0, 3))).toEqual(
	new Set(['/art/levels/l01.webp', '/art/levels/l02.webp', '/art/levels/l03.webp'])
);
```

and a second test that seeds `clearedThrough: 19` and asserts `new Set(imgs.slice(0, 3))` is `l20/l21/l22`, that `imgs.indexOf('/art/levels/l01.webp') > imgs.indexOf('/art/levels/l50.webp')` (the earlier gaps come last), and that all 50 plates are present. Keep the count assertions.

## Test

The added assertions must pass on the current build; then temporarily change `byLevel` to `return file.level` in `src/lib/pwa/downloads.svelte.ts` and confirm the mid-game test fails, proving it observes ordering rather than counts.
