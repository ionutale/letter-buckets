# Level map labels every tile with Package 1's theme

- **Severity:** medium
- **Area:** route
- **Location:** `src/routes/levels/+page.svelte:86`
- **Confidence:** certain

## What happens

While Package 2 or Package 3 is the active package, the level map prints Package 1's topic under each level number ("Pets", "Farm & Animals", …) instead of the topic the player will actually see. The map therefore contradicts the home screen and the level page, which do use the active package.

## Evidence

```svelte
85	{#each levels as level}
86		{@const content = data ? getLevelContent(locale, level) : null}
87		<button
...
98			<span class="theme">{content?.theme ?? ''}</span>
```

`packageId` is already available in this component (line 20, and passed to `ChapterTabs` on line 81), but it is not forwarded. `getLevelContent` defaults to `'p1'`:

```ts
// src/lib/content/index.ts:44-48
export function getLevelContent(locale, level, packageId: PackageId = 'p1') { … }
```

`tests/e2e/package.spec.ts:20` records that Package 2 level 1 is "Kitchen tools", while Package 1 level 1 is "Pets", so the same tile reads "Pets" on the map and "Kitchen tools" on the home screen and in the level header.

## Suggested fix

`{@const content = data ? getLevelContent(locale, level, packageId) : null}` — and add a regression assertion for p2/p3.

## Test

Seed p1 at `clearedThrough: 50`, go to `/en/`, click "Package 2", open `/en/levels`, and assert the first `button.level` contains "Kitchen tools" and not "Pets".
