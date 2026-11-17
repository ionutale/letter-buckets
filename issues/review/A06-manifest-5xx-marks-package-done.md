# A 5xx/403 manifest response permanently marks a package as fully downloaded

- **Severity:** medium
- **Area:** pwa
- **Location:** `src/lib/pwa/downloads.svelte.ts:179-185`
- **Confidence:** certain

## What happens

When the manifest request comes back non-OK for any reason, the code writes the package key into the `done` flags and returns — there is no distinction between "this package has no manifest yet" (a 404) and "the server is in a bad state" (500/502/503/403 during a deploy, a WAF block, an expired preview token). The flag is version-scoped, so once a single 5xx hits this path the player never downloads that package's audio and art again for that build; the failure is silent (no UI state, no retry).

## Evidence

```ts
// src/lib/pwa/downloads.svelte.ts:177
for (let attempt = 0; attempt < 2 && manifest === null; attempt++) {
    try {
        const response = await fetch(`/manifests/${pkg}/${locale}/${voiceKey(locale, voice)}.json`);
        if (!response.ok) {
            // Nothing generated for this package yet: treat it as complete.
            remember(key);          // <- also runs for 500, 502, 403, 429
            started.delete(key);
            return false;
        }
        manifest = (await response.json()) as Manifest;
```

`remember` writes the key to `localStorage` under the current build version:

```ts
// src/lib/pwa/downloads.svelte.ts:82
function remember(key: string): void {
	const state = flags();
	if (state.done.includes(key)) return;
	state.done.push(key);
	try {
		localStorage.setItem(FLAGS_KEY, JSON.stringify({ version, done: state.done }));
	} catch {}
}
```

and `addManifest` skips any key already present (`line 173`), so the package is never queued again until a new deployment changes `version`.

Trigger is ordinary: the app is deployed to Cloudflare Pages (`deploy:cf` in `package.json`); a user loading the page while an asset upload is in flight, or hitting a transient edge 5xx, gets a package that stays "downloaded" but has nothing in the cache. Offline playback for that package then fails with the SW's `Response.error()` path.

## Suggested fix

Only treat an explicit 404 as "nothing generated", and leave everything else unremembered so the next visit retries:

```ts
if (response.status === 404) {
	remember(key);
	started.delete(key);
	return false;
}
if (!response.ok) throw new Error(`manifest ${response.status}`);
```

(the surrounding `try/catch` already retries once and then returns `false` without `remember`).

## Test

Unit test with a `fetch` stub returning 503 for the p1 manifest:

```ts
vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 503 }));
await ensureDownloads();
expect(localStorage.getItem('letter-buckets-downloads')).not.toContain('p1:en:default');
```

and a second case with 404 that does contain the key.
