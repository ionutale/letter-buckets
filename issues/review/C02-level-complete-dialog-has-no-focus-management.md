# Level complete screen is a modal dialog that never takes focus

- **Severity:** high
- **Area:** a11y
- **Location:** `src/lib/components/LevelComplete.svelte:22`
- **Confidence:** certain

## What happens

The level-complete overlay declares `role="dialog" aria-modal="true"` but is never focused, has no focus trap and no Escape handler. Focus stays on the obscured level page behind the overlay, so keyboard and screen-reader users are not told the level ended and can still activate hidden controls (including the back link that leaves the level).

## Evidence

```svelte
21	{#if session.complete}
22		<div class="complete" role="dialog" aria-modal="true" aria-label={m.level_complete()}>
```

The component has no `tabindex`, no `bind:this`, no `onMount` focus call and no `keydown` listener (only `onnext`/`onclose`/`onwordbook` props, lines 7-14).

At the moment the third word is completed, the previously focused element is a `Slot` button that is now `disabled` (`Slot.svelte:24`) or a tray tile removed with the tray (`WordPanel.svelte:367`), so `document.activeElement` is `<body>`. The next Tab then focuses the level header's back link (`src/routes/levels/[level]/+page.svelte:166`), which sits behind the overlay and silently navigates away from the completion screen. Escape does nothing because the only Escape handler lived in `WordPanel`, which has unmounted.

## Suggested fix

Give the overlay `tabindex="-1"` plus a `bind:this`, focus it in `onMount`, trap Tab between its buttons (the helper in `WordPanel.svelte:64-75` can be shared), handle Escape → `onclose`, and mark the level content behind it inert (`inert` attribute or `aria-hidden`). Alternatively render a real `<dialog>` and call `showModal()`.

## Test

Playwright: solve level 1, assert `await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)`; press Tab ten times and assert the focused element stays inside the dialog; press Escape and assert navigation to `/en/levels`.
