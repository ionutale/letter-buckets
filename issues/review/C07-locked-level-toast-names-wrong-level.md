# Locked-level toast tells the child to finish the wrong level

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/routes/levels/+page.svelte:59`
- **Confidence:** certain

## What happens

Tapping a locked level shows "Finish level {n−1} first", which is wrong as soon as the locked level is more than one ahead of the player. With five levels cleared, tapping level 9 tells the child to finish level 8 — a level that is itself locked and cannot be opened. The actual next playable level is 6.

## Evidence

```ts
55	function open(level: number): void {
56		if (!data) return;
57		const state = stateFor(level);
58		if (state === 'locked') {
59			toast = m.finish_level_first({ n: Math.max(1, level - 1) });
```

The level that unlocks any locked level is `current` (line 43, `currentLevel(data, locale)`, i.e. `clearedThrough + 1`), not `level - 1`. Repro: seed `clearedThrough: 5`, open `/en/levels`, tap level 9 → "Finish level 8 first."; level 8 is locked and level 6 is the one that is open.

## Suggested fix

Use the derived current level: `m.finish_level_first({ n: current })`. For a locked level, `current` is always the single level that must be finished next.

## Test

E2e with `clearedThrough: 5`: open `/en/levels`, click the `button.level` for 9 and assert `getByRole('status')` reads "Finish level 6 first.". Keep the existing `map.spec.ts` case (clearedThrough 0, level 2 → "Finish level 1 first.") green, since it is the one-ahead special case that already holds.
