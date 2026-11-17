# The global focus ring is 2.47:1 against the page background, below the 3:1 minimum

- **Severity:** medium
- **Area:** build
- **Location:** `src/lib/styles/base.css:46-50`, colour from `src/lib/styles/tokens.css:10` (`--lb-ochre: #e8871f`) and `src/lib/styles/tokens.css:3` (`--lb-paper-2: #f9ecd2`)
- **Confidence:** certain

## What happens

The only focus indicator in the app is a 3 px outline in `--lb-ochre`. Measured against the two backgrounds it sits on, the contrast is 2.47:1 (`#fdf6e9`) and 2.27:1 (`#f9ecd2`) — both below the WCAG 2.2 SC 1.4.11 (Non-text Contrast) requirement of 3:1 for focus indicators. Keyboard, switch-access and low-vision users cannot reliably see where focus is, and the game is fully keyboard operable (tile buttons, panel focus trap in `WordPanel.svelte:51-74`), so focus visibility is the sole orientation cue.

## Evidence

```css
/* src/lib/styles/base.css:46 */
:focus-visible {
	outline: 3px solid var(--lb-ochre); /* #e8871f */
	outline-offset: 2px;
	border-radius: 8px;
}
```

No component overrides `:focus-visible` (`grep -rn "focus" src/**/*.svelte` only finds `.focus()` calls), so this is the indicator everywhere.

Relative luminance contrast, computed from the token values:

| pair                                   | ratio      |
| -------------------------------------- | ---------- |
| `#e8871f` on `#fdf6e9` (paper)         | **2.47:1** |
| `#e8871f` on `#f9ecd2` (paper-2)       | **2.27:1** |
| `#c4661a` (`--lb-ochre-dark`) on paper | 3.71:1     |
| `#9a4a12` (`--lb-ochre-deep`) on paper | 5.81:1     |

## Suggested fix

Use the already-defined darker ochre for the ring:

```css
:focus-visible {
	outline: 3px solid var(--lb-ochre-dark); /* #c4661a → 3.71:1 on paper, 3.41:1 on paper-2 */
	outline-offset: 2px;
	border-radius: 8px;
}
```

(The outline must also remain visible on ochre-filled buttons; there `--lb-ochre-deep` is the safe choice, or add a 1 px white/dark separator via `outline` + `box-shadow`.)

## Test

A unit test can pin the numbers rather than relying on axe (axe-core does not evaluate focus indicators):

```ts
// src/lib/styles/contrast.test.ts
import { readFileSync } from 'node:fs';
const css = readFileSync('src/lib/styles/tokens.css', 'utf8');
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1];
const lum = (hex: string) => {
	/* sRGB relative luminance */
};
const ratio = (a: string, b: string) => {
	/* (L1 + 0.05) / (L2 + 0.05) */
};

it('keeps the focus ring above 3:1 on both page backgrounds', () => {
	expect(ratio(token('lb-ochre-dark'), token('lb-paper'))).toBeGreaterThanOrEqual(3);
	expect(ratio(token('lb-ochre-dark'), token('lb-paper-2'))).toBeGreaterThanOrEqual(3);
});
```

With `--lb-ochre` the same test fails today (2.47 / 2.27).
