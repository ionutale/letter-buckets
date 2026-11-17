# About card is the only untranslated body text in the app

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/routes/settings/+page.svelte:308`
- **Confidence:** certain

## What happens

The About section of Settings always renders an English sentence, so on the Romanian/Italian/German/Russian UI a parent reading "Despre" gets English text — the one string in the app that skips the message catalogue.

## Evidence

```svelte
305 <section class="card about" aria-label={m.about()}>
	306 <h2>{m.about()}</h2>
	307
	<p>{m.app_name()} · v0.1</p>
	308
	<p>Nunito (OFL). Generated art and audio. No accounts, no analytics, no tracking.</p>
	309
</section>
```

Every other string in this component goes through `m.*` (lines 197-302), and `src/lib/i18n.test.ts:9-17` enforces identical non-empty keys in all five locales, so the missing entry is the only reason this text is not localised.

## Suggested fix

Add an `about_note` key to all five `messages/*.json` files (`"Nunito (OFL). …"`) and render `{m.about_note()}`.

## Test

Open `/ro/settings` and assert the About card's last paragraph matches the Romanian message (and contains no "No accounts"); the existing i18n key-parity test will cover the new key.
