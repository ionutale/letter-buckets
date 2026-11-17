# Settings changed in Package 3 are silently reverted

- **Severity:** high
- **Area:** route
- **Location:** `src/routes/levels/[level]/+page.svelte:114`
- **Confidence:** certain

## What happens

Muting the game or dismissing the coach while Package 3 is active is written only to the `letter-buckets-save-p3` record, but every load of that record overwrites `settings` with the Package 1 copy, so the choice is undone on the next navigation or reload: the game comes back unmuted and the tutorial comes back.

## Evidence

`persistPackage` mirrors settings into the shared (p1) save only when the active package is `p2`:

```ts
112	function persistPackage(value: SaveData): void {
113		persistSave(value, localStorage, packageId);
114		if (packageId === 'p2') {
115			const main = loadSave(localStorage);
116			main.settings = value.settings;
117			persistSave(main, localStorage);
118		}
119	}
```

but `loadSave` copies the p1 settings over _every_ non-p1 save, so the p3 copy is never read back:

```ts
// src/lib/storage/save.ts:231
if (packageId !== 'p1') data.settings = loadSave(storage, 'p1').settings;
```

Repro: with p1 and p2 cleared to 50, open Package 3, open any bucket, press the mute button (`+page.svelte:151` `toggleMute` → `persistPackage` at 156). Return to `/` (or reload). `+layout.svelte:23` re-reads the p1 save and the audio is unmuted again. The same path loses `dismissCoach` (`+page.svelte:134-139`), so the coach mark reappears on the next visit to a Package 3 level 1.

## Suggested fix

Treat every non-p1 package the same: `if (packageId !== 'p1') { … }`. Better, move the shared-settings mirror into `save.ts` (e.g. `persistSharedSettings(data, storage)`) and call it from both p2 and p3 so the rule lives next to `applySharedSettings`.

## Test

Unlock Package 3, open `/en/levels/1`, toggle mute (the button becomes `aria-pressed="false"`), navigate to `/en/` (the layout reloads audio settings from the p1 save), then reopen `/en/levels/1` and assert the mute button is still `aria-pressed="false"`. Add a unit test: persist a p3 save with `settings.muted = true` while p1 has `muted = false`, then assert `loadSave(storage, 'p3').settings.muted === true`.
