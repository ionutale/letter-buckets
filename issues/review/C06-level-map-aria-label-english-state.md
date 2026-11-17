# Level map announces level state in English on every locale

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/routes/levels/+page.svelte:94`
- **Confidence:** certain

## What happens

Each level button's accessible name interpolates the raw state enum, so a screen reader on the Romanian, Italian, German or Russian map says e.g. "Nivelul 2, locked". The only information about whether a level is finished, current or locked reaches non-English screen-reader users in English.

## Evidence

```ts
48	function stateFor(level: number): 'done' | 'current' | 'locked' {
...
94	aria-label={`${m.level_number({ n: level })}, ${state}`}
```

`state` is the untranslated union above; there is no message key for these three values in `messages/*.json`. The visible cues are a `★` and `🔒` inside `aria-hidden` spans (lines 99-100), so the aria-label is the only state signal AT receives.

## Suggested fix

Add `level_done`, `level_current`, `level_locked` messages to all five locales and map the enum through a lookup, e.g. `aria-label={`${m.level_number({ n: level })}, ${stateLabel[state](<>)}`}`.

## Test

Open `/ro/levels` and assert the second level button's accessible name equals `Nivelul 2, blocat`; repeat a locale-parity check in `src/lib/i18n.test.ts` for the three new keys.
