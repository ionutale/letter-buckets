# One missing banner image hides the artwork on every later level

- **Severity:** low
- **Area:** route
- **Location:** `src/routes/levels/[level]/+page.svelte:121`
- **Confidence:** likely

## What happens

Once any level banner fails to load, `artBroken` stays `true` for the lifetime of the page component. SvelteKit reuses the same component when only the `[level]` param changes, so every subsequent level reached through "Next level" shows no artwork even when its own image is present and cached.

## Evidence

```ts
38	let artBroken = $state(false);
...
121	function hideArt(event: Event): void {
122		artBroken = true;
123		(event.currentTarget as HTMLImageElement).style.display = 'none';
124	}
...
215	{#if !artBroken}
216		<img
217			class="banner"
218			src={getLevelArt(paramLevel, packageId)}
```

The level-switch effect (lines 71-110) rebuilds the session and the art URL but never resets `artBroken`; `nextLevel` (line 147) navigates to the sibling `/levels/{n+1}` URL, which SvelteKit treats as the same route, so no `onMount` runs and the state survives. `tests/e2e/resilience.spec.ts:12-17` only checks the single-level case.

## Suggested fix

Reset the flag when the level changes, e.g. `$effect(() => { paramLevel; artBroken = false; })` next to the session effect, or key the banner on the URL (`{#key paramLevel}`).

## Test

Route-abort `**/art/levels/l01.webp`, seed level 1 as completed (`levelWords: {1: [0,1,2]}`, `clearedThrough: 1`), open `/en/levels/1`, use the replay "Play" button, solve the three words, press "Next level", and assert `img.banner` has count 1 on `/en/levels/2`.
