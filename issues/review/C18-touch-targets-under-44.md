# Several controls are below the app's own 44 px touch target

- **Severity:** low
- **Area:** a11y
- **Location:** `src/routes/+page.svelte:491`
- **Confidence:** certain

## What happens

The package switch on the home screen is 38 px tall, and three other primary buttons are 36–40 px tall, while the rest of the app uses 44–48 px. On a phone handled by a small child these are the easiest controls to miss — and the package switch is a two-state pill group with only 2 px between targets.

## Evidence

```css
490	.package-switch button {
491		min-height: 38px;
492		padding: 0 var(--lb-space-3);
493		border-radius: var(--lb-radius-pill);
```

Other offenders: `src/lib/components/UpdateToast.svelte:39-41` `button { min-height: 36px }`, `src/lib/components/CoachMark.svelte:56-57` `min-height: 40px`, `src/lib/components/InstallHint.svelte:51-52` `min-height: 40px`. Compare the app's own standard: level map tiles 92 px (`levels/+page.svelte:147`), shelf links 56 px (`+page.svelte:526`), chapter tabs 76 px, `.hear` 44 px (`WordPanel.svelte:470`), `.back` 48 px.

## Suggested fix

Raise the package switch to `min-height: 48px` (matching `.lang`/`.round`) and the three toast/hint buttons to `min-height: 44px`.

## Test

Playwright bounding-box assertions at a 390×844 viewport: `.package-switch button`, `.update button`, `.coach button` and `.hint button` each have height ≥ 44.
