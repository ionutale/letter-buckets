# Word Book locked chips are announced as "question mark"

- **Severity:** medium
- **Area:** a11y
- **Location:** `src/lib/components/WordChip.svelte:36`
- **Confidence:** certain

## What happens

A locked word is a `<span>` whose only visible content is "?" and whose `aria-label` sits on a generic-role element, where naming is prohibited. Assistive technology therefore reads "question mark" and discards both the level number and the explanation. The unlocked chip's "Hear {word}" label is also hardcoded English.

## Evidence

```svelte
35	{:else}
36		<span class="chip locked" aria-label={`Word locked, level ${level}`}>?</span>
37	{/if}
```

No `role` is set, so the element keeps role=generic and the label is not exposed (axe `aria-prohibited-attr`); the "?" text is. The unlocked branch has the mirror problem of language:

```svelte
21 aria-label={`Hear ${word}`}
```

With 150 chips on `/words`, every locked one and every unlocked one is labelled in English regardless of locale.

## Suggested fix

Make the locked chip nameable and translated: `<span class="chip locked" role="img" aria-label={m.word_locked({ n: level })}>?</span>` (with `word_locked` added to all locales), and use `aria-label={m.hear_word()}` — or drop the unlocked `aria-label` entirely so the chip is named by its visible word plus the speaker icon.

## Test

Open `/ro/words` and assert `getByRole('img', { name: /nivelul 1/i })` exists for the first locked chip, that the unlocked chip's name is the Romanian "hear word" text, and that an axe run reports no `aria-prohibited-attr`.
