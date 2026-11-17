# Preview server returns 200 HTML for every missing asset

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/serve-preview.mjs:54`
- **Confidence:** certain

## What happens

Anything that is not a file on disk falls through to `200.html` with status 200, including `/audio/…mp3` and `/art/…webp`. Missing media therefore looks like a successful response to the app, the service worker caches the HTML shell under the asset URL, and every e2e assertion of the form `expect(status).toBe(200)` passes even when the asset does not exist. `pnpm preview` and `pnpm test:e2e` (whose webServer runs this script) both sit behind the bug.

## Evidence

```js
// scripts/serve-preview.mjs:43-57
try {
	const info = await stat(candidate);
	if (info.isFile()) {
		await send(candidate, response);
		return;
	}
} catch {
	// Fall through to the SPA shell.
}

try {
	await send(join(root, '200.html'), response);
} catch {
	response.writeHead(404).end('Not found');
}
```

`send()` always writes `200`, and there is no distinction between a navigation and an asset request. Measured on the current build:

```
missing mp3 -> 200 text/html; charset=utf-8 2222
missing webp -> 200 text/html; charset=utf-8 2222
real mp3   -> 200 audio/mpeg 3117
```

The tests relying on this are the offline/download ones:

```ts
// tests/e2e/offline.spec.ts:31-36
const audio = await page.evaluate(async () => (await fetch('/audio/words/en/l01-w1.mp3')).status);
const image = await page.evaluate(async () => (await fetch('/art/levels/l01.webp')).status);
const clue = await page.evaluate(async () => (await fetch('/art/words/en/l01-w1.webp')).status);
expect(audio).toBe(200);
```

`fetch` resolves with 200 for the HTML shell, and `respondCacheFirst` stores it because `response.ok` is true, so the test asserts that _something_ came back, not that the clip was cached. A build that lost `static/audio` would still pass this test (the queue would also "succeed" — `store()` in `downloads.svelte.ts:107-110` only checks `response.ok`).

## Suggested fix

Only serve the shell for navigation requests, and 404 everything else:

```js
const wantsShell = (request.headers.accept ?? '').includes('text/html')
	&& !extname(pathname);
...
if (!wantsShell) {
	response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
	return;
}
await send(join(root, '200.html'), response);
```

## Test

`curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:4173/audio/words/en/l99-w1.mp3` must report `404 text/plain`, `/en/levels/3` must still report `200 text/html`, and `pnpm test:e2e` must stay green.
