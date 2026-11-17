# `applyUpdate` arms a reload even when there is nothing to activate

- **Severity:** low
- **Area:** pwa
- **Location:** `src/lib/pwa/client.ts:69-72`, `src/lib/pwa/client.ts:37-41`
- **Confidence:** likely

## What happens

`applyUpdate` sets `updateRequested = true` unconditionally, then posts to `registration?.waiting`, which may be `undefined` (registration still pending, registration failed, or the new worker already activated). The flag is never cleared. From then on **any** `controllerchange` — including one caused later by a worker the browser activates on its own — reloads the page, which is exactly the mid-play reload the file's own comments say they avoid ("so an update never reloads the page in the middle of a word").

## Evidence

```ts
// src/lib/pwa/client.ts:37
navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    window.location.reload();
});
...
// src/lib/pwa/client.ts:69
export function applyUpdate(): void {
    updateRequested = true;                                  // set even if nothing waits
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
```

`registration` is only assigned inside the `register().then(...)`, which is also allowed to fail silently (`client.ts:49-52`), and `registration.waiting` is `null` whenever the installed worker has already been promoted. In both cases the click produces no visible effect but leaves the page primed to reload at an unrelated moment.

## Suggested fix

Only arm the reload when a waiting worker was actually told to skip:

```ts
export function applyUpdate(): void {
	const waiting = registration?.waiting;
	if (!waiting) return;
	updateRequested = true;
	waiting.postMessage({ type: 'SKIP_WAITING' });
}
```

Optionally reset `updateRequested = false` if no `controllerchange` arrives within a few seconds.

## Test

Extend `src/lib/pwa/client.dom.test.ts`:

```ts
const reload = vi.fn();
Object.defineProperty(window, 'location', { value: { reload }, configurable: true });
client.initPwa({ force: true });
await Promise.resolve();
await Promise.resolve();
registration.waiting = null;
client.applyUpdate(); // nothing to activate
controllerChangeListener(); // e.g. browser-driven activation
expect(reload).not.toHaveBeenCalled();
```

Today this reloads the page; the assertion fails.
