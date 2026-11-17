# Bucket group is labelled with a string that is ignored (and untranslated)

- **Severity:** medium
- **Area:** a11y
- **Location:** `src/routes/levels/[level]/+page.svelte:227`
- **Confidence:** certain

## What happens

The three buckets are wrapped in a plain `<div aria-label="Words">`. `aria-label` is not an allowed property on the generic role, so the container is exposed with no name at all; the string is also hardcoded English. Screen-reader users lose the grouping that sighted users read from the layout, and axe flags the attribute.

## Evidence

```svelte
226	{#if session}
227		<div class="buckets" aria-label="Words">
228			{#each session.buckets as bucket (bucket.index)}
```

There is no `role` on the element, so it keeps role=generic, where ARIA 1.2 sets "Name From: prohibited" — the label is dropped (axe rule `aria-prohibited-attr`). The individual buckets are named correctly (`Bucket.svelte:19-23`), but nothing tells a screen reader that these three buttons form the word set, and the English "Words" is not available in `messages/*.json`.

## Suggested fix

`<div class="buckets" role="group" aria-label={m.words()}>` with a new `words` message, or turn it into a `<section aria-label>`/`<fieldset>` with a legend.

## Test

Run axe on `/en/levels/1` and assert no `aria-prohibited-attr` violation; add `expect(page.getByRole('group', { name: /words/i })).toHaveCount(1)`.
