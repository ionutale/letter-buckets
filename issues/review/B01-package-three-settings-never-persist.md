# Settings saved while playing Package 3 are written to a key that `loadSave` ignores, so mute and coach state revert

- **Severity:** medium
- **Area:** storage
- **Location:** `src/lib/storage/save.ts:226-233` (`applySharedSettings`), `src/lib/storage/save.ts:325-331` (`persistSave`)
- **Confidence:** certain

## What happens

`persistSave(data, storage, 'p2' | 'p3')` writes the full `SaveData` — including `settings` — into that package's own key, but `loadSave(..., 'p2' | 'p3')` immediately replaces `data.settings` with the settings read from the Package 1 key. Every setting written through a non-p1 `persistSave` is therefore discarded on the next load. The level screen compensates by hand for Package 2 only, so in Package 3 the mute toggle and the coach-mark dismissal silently revert.

## Evidence

The read side always overrides the package's stored settings:

```ts
// src/lib/storage/save.ts:226
function applySharedSettings(
	data: SaveData,
	storage: KeyValueStorage,
	packageId: PackageId
): SaveData {
	if (packageId !== 'p1') data.settings = loadSave(storage, 'p1').settings;
	return data;
}
```

and it is applied on every return path of `loadSave` (`save.ts:262, 265, 272, 275, 322`). The write side stores whatever it is given under the package key:

```ts
// src/lib/storage/save.ts:325
export function persistSave(
	data: SaveData,
	storage: KeyValueStorage,
	packageId: PackageId = 'p1'
): void {
	storage.setItem(saveKey(packageId), JSON.stringify(data));
}
```

The level route only copies settings back to the p1 key for `p2`:

```ts
// src/routes/levels/[level]/+page.svelte:112
function persistPackage(value: SaveData): void {
	persistSave(value, localStorage, packageId);
	if (packageId === 'p2') {
		const main = loadSave(localStorage);
		main.settings = value.settings;
		persistSave(main, localStorage);
	}
}
```

There is no `p3` branch, and `toggleMute()` / `dismissCoach()` both go through `persistPackage` (`+page.svelte:135-139`, `:206-210`). Reproduced against the real module with an in-memory store:

```
p1 settings lost: none
p2 settings lost: muted,mode,coachDone,volumes
p3 settings lost: muted,mode,coachDone,volumes
```

Player-visible sequence: switch to Package 3, tap the speaker button in the level header (audio mutes), navigate or reload — `+layout.svelte` re-applies `loadSave(localStorage).settings.muted` (still `false`) and the app comes back unmuted with the icon reset. Dismissing the coach mark on Package 3 level 1 has the same fate, so it reappears on every visit.

## Suggested fix

Make the p1 key the single owner of settings instead of two half-implementations: have `persistSave` route settings to `SAVE_KEY` when `packageId !== 'p1'` (read-modify-write the p1 save, replace `settings`, write it back) and delete `applySharedSettings`'s override on read, or add an explicit `persistSettings(storage, settings)` used by every settings mutation and stop storing settings inside the p2/p3 payloads. Then remove the ad-hoc `packageId === 'p2'` branch in the level route.

## Test

Unit test in `src/lib/storage/save.test.ts`, for each package id:

```ts
for (const pid of ['p1', 'p2', 'p3'] as const) {
	const store = memoryStorage();
	const data = loadSave(store, pid);
	data.settings.muted = true;
	data.settings.coachDone = true;
	persistSave(data, store, pid);
	expect(loadSave(store, pid).settings).toMatchObject({ muted: true, coachDone: true });
}
```

E2E: seed a save where Packages 2 and 3 are unlocked, open `/en/levels/1` with `activePackage: 'p3'`, click the mute button, reload, and assert `aria-pressed` is still `false` and the stored p1 save has `muted: true`.
