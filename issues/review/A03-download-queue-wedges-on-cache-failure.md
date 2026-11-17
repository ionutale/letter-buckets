# A rejected `caches.open()` wedges the download queue and leaves the progress bar stuck on screen

- **Severity:** medium
- **Area:** pwa
- **Location:** `src/lib/pwa/downloads.svelte.ts:113-117` (state set before the first await), `src/lib/pwa/downloads.svelte.ts:152-163` (only place the state is cleared)
- **Confidence:** possible

## What happens

`runQueue` sets `running = true` and `progress.active = true` before it touches `caches.open()`, and resets them only at the end of the happy path. If `caches.open()` rejects (storage blocked / bucket creation denied / quota) or `caches` is unavailable and throws synchronously, the function's promise rejects, `running` stays `true` for the lifetime of the module, and `progress.active` stays `true`. `DownloadBar` is driven by `downloads.progress.active`, so a "Preparing the game… 0%" bar stays pinned to the top of every screen and **no download ever runs again in that session** — the `if (running) return;` guard at line 114 short-circuits every later call, including the retry and `online` attempts.

## Evidence

```ts
// src/lib/pwa/downloads.svelte.ts:113
async function runQueue(): Promise<void> {
    if (running) return;
    running = true;
    progress.active = true;
    const cache = await caches.open(`letter-buckets-${version}`);   // can reject
    ...
    started.clear();
    running = false;          // only reached on the success path
    progress.active = false;
```

Nothing wraps the body in `try/finally`, and the single caller does not handle the rejection either:

```ts
// src/lib/pwa/downloads.svelte.ts:224
if (queued || queue.length > 0) void runQueue(); // floating promise -> unhandled rejection
```

`ensureDownloads()` itself is called with `void ensureDownloads()` in `src/routes/+layout.svelte:32` and `src/routes/levels/[level]/+page.svelte:107`, so a rejection is not surfaced anywhere either.

The bar itself is not dismissible and has no timeout:

```svelte
<!-- src/lib/components/DownloadBar.svelte:20 -->
{#if downloads.progress.active}
    <div class="download-bar" role="progressbar" ...>
```

## Suggested fix

```ts
async function runQueue(): Promise<void> {
    if (running) return;
    running = true;
    progress.active = true;
    try {
        const cache = await caches.open(`letter-buckets-${version}`);
        ... existing loop ...
    } catch {
        // Storage unavailable: stop trying for this session, keep the UI clean.
        queue = [];
    } finally {
        started.clear();
        running = false;
        progress.active = false;
        if (queue.length > 0 && retry === null) { /* existing retry scheduling */ }
    }
}
```

and `void runQueue().catch(() => undefined)` at the call site.

## Test

Unit test with a stubbed `caches`:

```ts
vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new Error('blocked')) });
await ensureDownloads();
expect(downloads.progress.active).toBe(false); // currently stays true
// and a later call can try again
await ensureDownloads();
expect(caches.open).toHaveBeenCalledTimes(2);
```

An E2E variant: block storage (`context.addInitScript(() => { Object.defineProperty(window, 'caches', { value: undefined }); })`), load `/`, and assert no element with `role="progressbar"` is present after a few seconds.
