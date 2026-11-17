# A package is marked as downloaded after its first file when new jobs are queued mid-run

- **Severity:** medium
- **Area:** pwa
- **Location:** `src/lib/pwa/downloads.svelte.ts:120-121` (`remaining` snapshot), `src/lib/pwa/downloads.svelte.ts:140-142` (`?? 1` default), `src/lib/pwa/downloads.svelte.ts:196-197` (jobs appended while the loop runs)
- **Confidence:** likely

## What happens

`runQueue` counts the files per manifest key once, when it starts. `ensureDownloads()` can be called again while that loop is still running (level completion and the `online` handler both call it), and `addManifest` appends new jobs to the same `queue`. Those new jobs have a key that is not in `remaining`, so the very first successful file of the new package resolves to `(undefined ?? 1) - 1 === 0` and `remember(key)` runs — the package is written to `localStorage` as fully downloaded after 1 of its 350 files. From then on `addManifest` returns early for that key (`flags().done.includes(key)`), so the remaining ~349 files are never queued again for that app version, and the package is not actually available offline.

## Evidence

```ts
// src/lib/pwa/downloads.svelte.ts:113
async function runQueue(): Promise<void> {
    if (running) return;
    running = true;
    ...
    // Files left per flag key, so a package is only marked done on its last one.
    const remaining = new Map<string, number>();
    for (const job of queue) remaining.set(job.key, (remaining.get(job.key) ?? 0) + 1);
```

The snapshot is taken once. `addManifest` keeps appending while the loop runs:

```ts
// src/lib/pwa/downloads.svelte.ts:196
const files = [...manifest.files].sort(...);
for (const file of files) queue.push({ file, key, pkg });
...
// src/lib/pwa/downloads.svelte.ts:140
const left = (remaining.get(result.value.key) ?? 1) - 1;   // unknown key -> 0 -> "done"
remaining.set(result.value.key, left);
if (left === 0) remember(result.value.key);
```

`ensureDownloads` is invoked from `src/routes/levels/[level]/+page.svelte:107` on level completion ("A finished Package 1 unlocks Package 2; queue it right away") and from the `online` listener in `src/routes/+layout.svelte:33` — both can land inside an active `runQueue` (the first `p1` run is ~1.5 MB of art and audio plus a retry window).

## Suggested fix

Keep the counter live instead of snapshotting it — increment when a job is queued:

```ts
const remaining = new Map<string, number>();

function enqueue(job: Job): void {
	queue.push(job);
	remaining.set(job.key, (remaining.get(job.key) ?? 0) + 1);
}
```

`addManifest` calls `enqueue(...)` for each file, and the `remaining.get(key) ?? 1` default becomes `?? 0` so an unknown key can never be reported as complete.

## Test

Unit test that queues a second manifest while the first is still running and asserts the flag is not written:

```ts
const spy = vi.spyOn(Storage.prototype, 'setItem');
// resolve the first p1 batch slowly so the second ensureDownloads happens mid-run
const p1 = ensureDownloads();
await Promise.resolve();
localStorage.removeItem('letter-buckets-downloads'); // pretend p2 is not known yet
vi.mocked(fetch).mockImplementation(/* p2 manifest */);
const p2 = ensureDownloads();
await Promise.all([p1, p2]);
expect(JSON.parse(spy.mock.calls.at(-1)![1] as string).done).not.toContain('p2:en:default');
```

only the last file of the `p2` manifest may trigger the `remember` call for `p2:en:default`.
