# Blocked or full localStorage leaves the level stuck on "…"

- **Severity:** high
- **Area:** route
- **Location:** `src/routes/levels/[level]/+page.svelte:56`
- **Confidence:** likely

## What happens

Every page reads and writes `localStorage` unguarded, although `+layout.svelte` deliberately guards the same calls. When storage access or writes throw (storage blocked by the browser, Safari private mode, quota exhausted), the level page's `onMount` aborts before `data` is set, so the screen shows the `…` loading placeholder forever; mid-level, a failing write aborts `session.place()` before the bucket is marked done, so a word can never be completed.

## Evidence

The layout states the intended behaviour explicitly:

```ts
// src/routes/+layout.svelte:22-28
try {
	const settings = loadSave(localStorage).settings;
	audio.setVolumes(settings.volumes);
	audio.setMuted(settings.muted);
} catch {
	// Private mode: the game still works, unmuted, for this session.
}
```

but the routes do not follow it. On the level page:

```ts
53	onMount(() => {
54		locale = getLocale() as Locale;
55		packageId = resolveActivePackage(localStorage, locale);
56		data = loadSave(localStorage, packageId);
57		muted = data.settings.muted;
```

The `localStorage` property read itself throws `SecurityError` in a storage-blocked context, before `loadSave`'s internal `try/catch` (save.ts:258-263) can help. `data` therefore stays `null`, the session-creation effect returns at `if (!data) return;` (line 73), and the template renders `<p class="loading">…</p>` (line 243) with no buckets, no error and no retry. The home page has the same shape at `src/routes/+page.svelte:26-29` (Play link falls back to level 1, and all package buttons stay disabled).

Separately, `persistSave` has no guard (`src/lib/storage/save.ts:325-331`) and is called from the `onAttempt`/`onWordComplete` callbacks (lines 92-96) that run inside `session.place`. A throwing `setItem` aborts `place()` after `word` was updated but before the bucket-done / level-complete block (`src/lib/game/session.svelte.ts:181-198`), so the word can never be finished for the rest of the session.

## Suggested fix

Add one safe storage adapter (`getItem`/`setItem` wrapped in `try/catch`, with an in-memory `Map` fallback) and use it in every route instead of raw `localStorage`. On a failed read, keep the default save in `data` so the level still renders; on a failed write, swallow the error so gameplay is never interrupted.

## Test

Playwright with `page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); })`: `/en/levels/1` must still render three buckets, and selecting a tile then a slot must complete the word. Repeat with only `Storage.prototype.setItem` patched to throw.
