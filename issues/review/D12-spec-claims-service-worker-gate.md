# Design says the queue waits for serviceWorker.ready; it does not

- **Severity:** low
- **Area:** docs
- **Location:** `docs/superpowers/specs/2026-11-17-package-downloads-design.md:58`
- **Confidence:** certain

## What happens

The spec lists "The queue waits for `navigator.serviceWorker.ready` before its first fetch, so every byte it downloads is kept" as an implemented decision. No such wait exists in the app, so a maintainer debugging "downloads not persisted" will look for a gate that is not there — or add one, and serialise the queue behind service-worker installation for no benefit.

## Evidence

```md
<!-- …-package-downloads-design.md:58-59 -->

- **The queue waits for `navigator.serviceWorker.ready`** before its first
  fetch, so every byte it downloads is kept.
```

```ts
// src/lib/pwa/downloads.svelte.ts:102-111
/**
 * The page writes into the same cache the service worker reads, so a file is
 * kept whether or not the worker has taken control yet. ...
 */
async function store(cache: Cache, path: string): Promise<void> {
	const response = await fetch(path);
	if (!response.ok) throw new Error(`${path} -> ${response.status}`);
	await cache.put(path, response);
}
```

`grep -rn serviceWorker src/lib` finds only `src/lib/pwa/client.ts` (registration and update toast); nothing in `downloads.svelte.ts` or the layout waits for `ready`. The comment in `store()` documents the actual mechanism — the page writes into `letter-buckets-${version}` through the Cache API, which works before the worker controls the page — so the design's stated constraint was replaced, not implemented. The e2e test compensates from the outside:

```ts
// tests/e2e/voice-offline.spec.ts:9
await page.evaluate(() => navigator.serviceWorker.ready);
```

## Suggested fix

Rewrite the decision to describe what the code does: "The queue writes into `letter-buckets-${version}` through the Cache API, so files are kept whether or not the worker controls the page; it starts as soon as the layer mounts." If the `ready` gate is still wanted, implement it in `ensureDownloads` before the first `runQueue` and say so.

## Test

`grep -n "serviceWorker.ready" src/lib/pwa/downloads.svelte.ts` must either match (spec true) or the spec line must be reworded. A doc check in review is enough; the behavioural test already exists in `tests/e2e/offline.spec.ts`, which proves files are cached without any explicit `ready` wait in the app.
