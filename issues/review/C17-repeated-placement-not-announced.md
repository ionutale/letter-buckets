# Consecutive drag placements are never announced

- **Severity:** low
- **Area:** a11y
- **Location:** `src/lib/components/WordPanel.svelte:149`
- **Confidence:** likely

## What happens

The polite live region is only announced when its text changes. A letter placed by dragging never passes through the "Letter X selected" message, so `announcement` goes from "Letter placed" to "Letter placed" and Svelte does not touch the DOM: after the first drag, every further placement is silent for a screen-reader user.

## Evidence

```ts
125	announcement = selectedId ? m.letter_selected({ letter: tile.letter }) : '';
...
147		} else {
148			audio.playSfx('tile-place');
149			announcement = m.letter_placed();
150		}
```

The tap–tap flow calls `selectTile` (line 203) before `attempt`, so the text alternates and is announced. The drag flow goes straight from `onTilePointerUp` (line 210 `if (Number.isInteger(slot)) attempt(current.tileId, slot);`) to `attempt`, leaving the string unchanged. Because Svelte compares the value before writing, the `.sr-only[aria-live="polite"]` node (line 384) keeps the same text and no announcement is emitted.

## Suggested fix

Include the destination in the message (`letter_placed` with a slot number, e.g. "Letter placed in slot 3") or clear the region and set it again on the next microtask so the text always changes. Keeping the last message is fine visually because the region is visually hidden.

## Test

With Playwright, drag two letters in a row and assert the live region's `textContent` differs after each drop (or attach a `MutationObserver` in the page and expect at least two mutations).
