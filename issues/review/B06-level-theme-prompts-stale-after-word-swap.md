# Level-theme prompts still describe the pre-gap-ramp words, so the shared banners illustrate words the level no longer contains

- **Severity:** low
- **Area:** content
- **Location:** `src/lib/content/themes.ts:26` (level 20), with the same drift at `themes.ts:13, 25, 45, 56`; level data at `src/lib/content/levels.en.ts:25`
- **Confidence:** certain

## What happens

Commit `1b9c405` ("repeat the 1/2/3/4 gap ramp in every chapter") replaced words in ~20 levels of every locale so that each word could carry the new gap counts, but the `THEME_PROMPTS` list — the art-direction source of truth used by `scripts/generate_art.py` — was not updated, and the already-committed `static/art/levels/l*.webp` banners were not regenerated. The level screen's banner therefore depicts the *old* words. Level 20 ("Baby animals") now asks for DUCKLING / PIGLET / KITTEN while its banner shows a chick, a calf and a lamb; the prompts still say "a chick, a calf and a lamb", so any regeneration repeats the mistake.

## Evidence

```ts
// src/lib/content/themes.ts:26  (prompt for level 20)
'a barn corner with a chick, a calf and a lamb',
```

```ts
// src/lib/content/levels.en.ts:25
level(20, 'Baby animals', 'DUCKLING', 'PIGLET', 'KITTEN'),
```

The old English level 20 was `level(20, 'Baby animals', 'CHICK', 'CALF', 'LAMB')` — visible in the diff of `1b9c405` — and the committed banner still shows exactly those three animals (verified by decoding `static/art/levels/l20.webp`: a yellow chick, a brown calf and a white lamb). The gap-ramp commit touched all five locale files (`levels.{en,ro,it,de,ru}.ts`) and left `themes.ts` untouched.

Other English levels whose banner now illustrates removed words: 17 (`PEA` → `PEPPER`, prompt still "a pea pod"), 18 (`ROSE` → `POPPY`, "a flower bed with a rose"), 19 (`OAK`/`PINE` → `CEDAR`/`WILLOW`, "a small grove with an oak, a pine and a maple"), 28 (`CHEF` → `PAINTER`), 29 (`SHOP`/`CART` → `BASKET`/`TROLLEY`, "a basket, a cart and a coin"), 36 (`ICE` → `FROST`), 38 (`DARK`/`MOTH` → `SHADOW`/`MIDNIGHT`), 39 (`SUN`/`MOON`/`GLOW` → `SUNSET`/`ECLIPSE`/`CRESCENT`, "a sunny sky with a sun, a moon and a soft glow"), 50 (`HUG`/`SMILE`/`CHEER` → `FIREWORK`/`FESTIVAL`/`PARADE`, "a celebration with a hug, a smile and a cheer" — the banner is two people hugging). Locales that kept the old meaning (e.g. German level 20 `KÜKEN/KALB/LAMM` before the swap) show how the shared banner drifted away from the English word list specifically.

The banner is decorative (`alt=""`, per the design doc), so nothing breaks at runtime, but the picture no longer "sets the scene" for the words the child is spelling, and regenerating art from the current prompts would reproduce the mismatch.

## Suggested fix

Update each drifted prompt in `THEME_PROMPTS` to the current three words (e.g. level 20 → "a barn corner with a duckling, a piglet and a kitten", level 50 → "a celebration with fireworks, a festival banner and a parade") and regenerate the affected `static/art/levels/l*.webp`; or revert those words if the original art is preferred. Add a guard so this cannot drift again:

```ts
it('every theme prompt mentions its level words', () => {
	for (const [i, level] of CONTENT.en.levels.entries()) {
		const prompt = THEME_PROMPTS[i].toLowerCase();
		for (const { word } of level.words) {
			expect(prompt, `level ${level.id}: ${word}`).toContain(word.toLowerCase());
		}
	}
});
```

(loosen to "at least one of the three words" if synonyms are allowed).

## Test

With the test above, level 20 fails with `level 20: DUCKLING` against the current prompt; after the fix the visual snapshot for `/en/levels/20` (`tests/visual/app.spec.ts`) changes to show the new animals.
