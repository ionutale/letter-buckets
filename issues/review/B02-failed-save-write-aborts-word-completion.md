# A failing `localStorage` write throws out of the placement callback and aborts word/level completion

- **Severity:** medium
- **Area:** storage
- **Location:** `src/lib/storage/save.ts:325-331` (`persistSave`), with the uncaught path through `src/lib/game/session.svelte.ts:181`
- **Confidence:** likely

## What happens

`loadSave` defends every storage access with `try/catch` (and `+layout.svelte` wraps its settings read in another one, with a comment about private mode), but `persistSave` calls `storage.setItem` bare. The level screen persists synchronously from `onAttempt`, which the session invokes in the middle of `place()`, after the puzzle state has been updated but before the completion checks run. When `setItem` throws (QuotaExceededError in private mode, a storage that is disabled, or a full quota), the exception unwinds through `place()` and the remaining steps — arming the idle hint, marking the bucket done, `onWordComplete`, `onLevelComplete` — never execute. The child sees the last letter accepted but the word never completes and nothing is saved.

## Evidence

```ts
// src/lib/storage/save.ts:325
export function persistSave(
	data: SaveData,
	storage: KeyValueStorage,
	packageId: PackageId = 'p1'
): void {
	storage.setItem(saveKey(packageId), JSON.stringify(data));   // no try/catch
}
```

Compare with the read path, which is guarded at `save.ts:258-263`:

```ts
let raw: string | null;
try {
	raw = storage.getItem(saveKey(packageId));
} catch {
	return applySharedSettings(fallback, storage, packageId);
}
```

and with `src/routes/+layout.svelte:23-28`, which says out loud that storage may fail and the game must keep working:

```ts
try {
	const settings = loadSave(localStorage).settings;
	audio.setVolumes(settings.volumes);
	audio.setMuted(settings.muted);
} catch {
	// Private mode: the game still works, unmuted, for this session.
}
```

The session calls the persisting callback in the middle of the placement:

```ts
// src/lib/game/session.svelte.ts:176
const result = placeTile(word, tileId, slot);
word = result.state;
hintStep = 0;
lastHint = null;
if (result.outcome !== 'placed') mistakesThisWord = true;
options.onAttempt?.(level, index, result.outcome === 'placed');   // <-- persistSave throws here
armHintTimer();

if (result.outcome === 'placed' && isComplete(word)) {
```

`onAttempt` is wired to `recordAttempt(...); persistPackage(data)` in `src/routes/levels/[level]/+page.svelte:96-99`. Because `word` was already reassigned, the UI paints the letter as placed while `buckets[i].status = 'done'` (line 187) and `complete = true` (line 196) are skipped, producing a permanently stuck word until the page is reloaded — at which point the placement is gone as well.

## Suggested fix

Make writes non-fatal and report them: wrap the `setItem` in `try/catch` inside `persistSave` (return a boolean), and keep the game state machine independent of persistence. Alternatively, call the persistence callback after the completion bookkeeping (end of `place()`), or schedule it in a microtask, so a storage failure can never strand the puzzle mid-flight.

## Test

```ts
it('keeps playing when the store rejects a write', () => {
	const store = {
		getItem: () => null,
		setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); }
	};
	expect(() => persistSave(defaultSave(), store)).not.toThrow();
});
```

And at the session level: pass `onAttempt` that throws, place the final letter, and assert the bucket still becomes `done` and `onWordComplete` fires.
