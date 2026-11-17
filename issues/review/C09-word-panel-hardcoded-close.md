# Word panel's close button is hardcoded in English

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/lib/components/WordPanel.svelte:239`
- **Confidence:** certain

## What happens

The close control of the word dialog is labelled "Close" in all five languages even though the translation already exists, so Romanian, Italian, German and Russian screen-reader users hear an English word for the control they need to leave the dialog. The letter tray has the same problem with "Letter tiles".

## Evidence

```svelte
239 <button type="button" class="icon" aria-label="Close" onclick={close}>×</button>
```

`messages/en.json` defines `"close": "Close"`, and the other locales translate it (`"Închide"`, `"Chiudi"`, `"Schließen"`, `"Закрыть"`), but `m.close()` is never used anywhere in `src/`. The same file hardcodes the tray:

```svelte
366	<div class="tray" aria-label="Letter tiles">
```

`aria-label` on a plain `div` (generic role) is also ignored by assistive technology, so this string is both untranslated and non-functional.

## Suggested fix

`aria-label={m.close()}` for the button, and for the tray add a `letter_tiles` message plus `role="group"` so the label is exposed.

## Test

Open `/ro/levels/1`, open the first bucket, and assert the close button's accessible name is `Închide`; add an axe run on the open panel that reports no prohibited `aria-label` on the tray.
