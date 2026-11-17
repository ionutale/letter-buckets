# The download queue retries permanent failures forever, every 15 seconds

- **Severity:** medium
- **Area:** pwa
- **Location:** `src/lib/pwa/downloads.svelte.ts:145-163`
- **Confidence:** certain

## What happens

Any rejection from `store()` — a 404/410 for a clip listed in a manifest, a `QuotaExceededError` from `cache.put`, a 403 from a CDN rule — is treated exactly like "offline". The failed jobs are pushed back onto the queue and a retry is scheduled 15 s later. There is no attempt counter, no backoff and no terminal state, so a permanently failing file makes the page re-fetch it every 15 s for as long as the tab is open, while `progress.active` flips on and off (the bar appears, fails on the first batch, disappears, and returns) and `progress.done` never reaches `progress.total`.

## Evidence

```ts
// src/lib/pwa/downloads.svelte.ts:107
async function store(cache: Cache, path: string): Promise<void> {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} -> ${response.status}`);   // 404/403/quota all land here
    await cache.put(path, response);                                      // rejects on quota / 206
}
...
// src/lib/pwa/downloads.svelte.ts:145
if (failed.length > 0) {
    // Offline or a bad response: keep the rest for the next visit.
    queue = [...failed, ...queue];
    break;
}
...
} else if (retry === null) {
    // Offline or a bad run: try again while this page stays open.
    retry = setTimeout(() => {
        retry = null;
        void runQueue();
    }, 15000);
}
```

The only exit is `queue.length === 0`, so a single permanently failing entry keeps the loop alive indefinitely. Because the failure is retried, `remember(key)` at line 142 is never reached for that package, so the package is also never marked complete — but nothing tells the user why, and every 15 s three more requests are issued.

Realistic triggers: the Cache API rejects `put` for partial (206) responses — `<audio>` loads that bypass the downloader are range requests — and Safari throws `QuotaExceededError` once the origin's storage budget is reached (the app caches ~20 MB of audio plus the precache).

## Suggested fix

Give every job an attempt budget and drop it when the budget is spent:

```ts
interface Job {
	file: ManifestFile;
	key: string;
	pkg: PackageId;
	attempts: number;
}

const MAX_ATTEMPTS = 3;

// in the failure branch
const retryable: Job[] = [];
for (const job of failed) {
	job.attempts += 1;
	if (job.attempts < MAX_ATTEMPTS) retryable.push(job);
}
queue = [...retryable, ...queue];
if (queue.length === 0) {
	// Nothing left that can succeed: stop the loop, keep the UI clean.
	break;
}
retry = setTimeout(
	() => {
		retry = null;
		void runQueue();
	},
	Math.min(15000 * failed.length, 60000)
);
break;
```

and push `{ file, key, pkg, attempts: 0 }` in `addManifest`. A 4xx can additionally be treated as terminal immediately by keeping the status from `store()` on the error object.

## Test

Unit test with a `fetch` stub that always returns 404 for one path:

```ts
vi.useFakeTimers();
await ensureDownloads();
await vi.runAllTimersAsync();
const calls = fetch.mock.calls.filter(([p]) => p === '/audio/words/en/l01-w1.mp3').length;
expect(calls).toBeLessThanOrEqual(4); // currently unbounded
expect(downloads.progress.active).toBe(false);
```

Also assert `downloads.progress.active` does not flip back to `true` after the retry cap is hit.
