# Reset progress cannot be triggered by keyboard

- **Severity:** high
- **Area:** a11y
- **Location:** `src/routes/settings/+page.svelte:289`
- **Confidence:** certain

## What happens

The only control that resets a child's progress requires a three-second pointer hold. It listens exclusively to pointer events, so pressing Enter or Space on the focused button does nothing: keyboard, switch-access and Voice Control users cannot reset at all, and nobody who cannot see the fill bar gets progress feedback during the hold.

## Evidence

```svelte
289 <button
	290
	type="button"
	291
	class="reset"
	292
	onpointerdown={startHold}
	293
	onpointerup={endHold}
	294
	onpointerleave={cancelHold}
	295
	onpointercancel={endHold}
	296
	oncontextmenu={(event) => event.preventDefault()}
	297
>
	298 <span class="bar" style={`width:${Math.round(holdProgress * 100)}%`}></span>
	299 <span class="reset-label">{m.reset_progress()}</span>
	300
</button>
```

There is no `onclick`, `onkeydown` or `onkeyup`. A `<button>` activated with Enter/Space fires `click`, which has no handler, so `startHold` is never called (WCAG 2.1.1 Keyboard). The progress element (line 298) is a plain `<span>` with no `role="progressbar"`, no `aria-valuenow` and no live region, so the 3-second hold is also invisible to screen readers until `showToast(m.reset_done())` appears afterwards.

## Suggested fix

Keep the pointer hold but add a keyboard equivalent: on `keydown` Enter/Space start the same timer, on `keyup` (or blur, or a second Enter) cancel/confirm it. Expose the fill as `role="progressbar"` with `aria-valuemin/max/now` and put an `aria-live="polite"` status on the completed message.

## Test

Playwright: `await reset.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(3200); await page.keyboard.up('Space');` then assert the `.toast` shows the reset message and `/en/` returns to level 1. Also assert `getByRole('progressbar')` exists after the pointer-down.
