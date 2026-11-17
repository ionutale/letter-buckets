# Why Package 2/3 is locked is invisible to keyboard and screen-reader users

- **Severity:** medium
- **Area:** a11y
- **Location:** `src/routes/+page.svelte:160`
- **Confidence:** certain

## What happens

Locked package buttons are natively `disabled` and carry the explanation only in a `title` attribute. A disabled button cannot be focused, so neither a keyboard user nor a screen reader can discover why Package 2 or 3 is unavailable: the lock icon is `aria-hidden` and the accessible name is just "Package 2".

## Evidence

```svelte
156	<button
157		type="button"
158		class:active={packageId === 'p2'}
159		aria-pressed={packageId === 'p2'}
160		disabled={!mainData || !isPackageUnlocked(mainData, locale, 'p2')}
161		title={!mainData || !isPackageUnlocked(mainData, locale, 'p2') ? m.package_locked() : ''}
162		onclick={() => selectPackage('p2')}
163	>
164		{#if mainData && !isPackageUnlocked(mainData, locale, 'p2')}<svg
165				class="lock"
...
167				aria-hidden="true"
```

`title` on a `disabled` control is unreachable without a pointer (no focusable element for the tooltip to hang on) and is inconsistently exposed by AT. The same pattern repeats for Package 3 (lines 187-194). The lock reason therefore exists only visually.

## Suggested fix

Prefer `aria-disabled="true"` plus a guard in `selectPackage` (which already returns early) so the button stays focusable and its name can include the reason: `aria-label={`${m.package_2()}, ${m.package_locked()}`}`. If `disabled` must stay, render the reason as visible text under the switch and reference it with `aria-describedby`.

## Test

With a fresh save, open `/en/` and assert both locked buttons expose the reason: `getByRole('button', { name: /package 2, finish package 1/i })`, and that tabbing from the language link reaches them.
