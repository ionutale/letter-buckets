# Letter tiles announce "Letter A" in English on every locale

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/lib/components/LetterTile.svelte:35`
- **Confidence:** certain

## What happens

Every tile in the word tray gets its accessible name from a hardcoded English fallback, so a Romanian or Russian child's screen reader says "Letter A" for the most-used control in the game. The equivalent slot control is already translated, which makes the tray stand out as untranslated.

## Evidence

```ts
32	const accessibleLabel = $derived(
33		label ??
34			(state === 'empty'
35				? 'Empty letter slot'
36				: state === 'tile' || state === 'selected'
37					? `Letter ${letter}`
38					: letter)
39	);
```

`WordPanel` renders the tray tiles without a `label` prop (`WordPanel.svelte:368-379`), so this default is what is exposed. Compare the slot, which uses messages:

```ts
// src/lib/components/Slot.svelte:23
aria-label={filled ? m.letter_label({ letter }) : m.empty_slot({ n: index + 1 })}
```

`m.letter_label` and `m.empty_slot` exist in all five locales; there is simply no message key for the tray tile, and `LetterTile`'s `state === 'empty'` branch is also unreachable from any localised path.

## Suggested fix

Add a `letter_tile` message (`"Letter {letter}"`) in the five locale files, use `m.letter_tile({ letter })` for `state === 'tile' | 'selected'`, and pass the label explicitly from `WordPanel` where the tile is rendered.

## Test

Open `/de/levels/1`, open a bucket, and assert the first tray tile's accessible name equals the German `letter_tile` message; add the key to `src/lib/i18n.test.ts` key-parity coverage automatically.
