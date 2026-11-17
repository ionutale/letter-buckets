# Tab focus escapes the word panel after placing a letter

- **Severity:** medium
- **Area:** a11y
- **Location:** `src/lib/components/WordPanel.svelte:64`
- **Confidence:** likely

## What happens

The dialog's focus trap only intercepts Tab when focus is on the first or last focusable element. Placing a letter disables the focused slot (or removes the focused tray tile), so focus falls to `<body>` and the next Tab leaves the `aria-modal` dialog and lands on the level header's back link behind it.

## Evidence

```ts
64	if (event.key !== 'Tab' || !panelEl) return;
65	const focusables = [...panelEl.querySelectorAll<HTMLElement>('button:not([disabled])')];
...
69	if (event.shiftKey && document.activeElement === first) { … }
72	else if (!event.shiftKey && document.activeElement === last) { … }
```

The trap has no fallback for "activeElement is not in the panel". After a keyboard placement the slot becomes unfocusable — `Slot.svelte:24` `disabled={filled}` — and after a pointer placement the tray re-renders without the placed tile (`WordPanel.svelte:367 {#each word.remaining as tile (tile.id)}`), so `document.activeElement` becomes `<body>` (Chrome moves focus off a disabled/removed control). `attempt()` (lines 128-163) never moves focus anywhere.

Repro: open a bucket, keyboard-select a tile, focus a gap, press Enter, then press Tab once. Focus lands on the `←` link at `src/routes/levels/[level]/+page.svelte:166`, outside the modal.

## Suggested fix

After a successful `place`, move focus deterministically (next empty `[data-slot]`, else the "Back to buckets" button) and, in the keydown handler, first check `!panelEl.contains(document.activeElement)` and focus `panelEl` instead of letting the browser continue.

## Test

E2e: place a letter by keyboard, press Tab once, and assert `document.activeElement.closest('[role="dialog"]')` is not null; repeat for the drag flow and for the last gap (which swaps the tray for the done card).
