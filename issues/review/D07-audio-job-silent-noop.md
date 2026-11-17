# Audio job exits 0 after generating nothing

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/generate_audio.mjs:186`
- **Confidence:** certain

## What happens

Every filter in `generate_audio.mjs` is applied silently. If the gitignored content exports are missing, a package is dropped from the run; if `--package`, `--locale` or `--voice` has a typo, the selection becomes empty. In both cases the script prints nothing useful and exits 0, so a batch that generated zero clips looks exactly like a successful one.

## Evidence

```js
// scripts/generate_audio.mjs:186-193
function selectedPackages() {
	return PACKAGES.filter(
		(pkg) => (!ONLY_PACKAGE || pkg.id === ONLY_PACKAGE) && existsSync(pkg.content)
	).map((pkg) => ({
		...pkg,
		content: JSON.parse(readFileSync(pkg.content, 'utf8'))
	}));
}
```

`scripts/content.p2.json` and `content.p3.json` are listed in `.gitignore` and only appear after `pnpm content:export`. Running `pnpm assets:audio` (which does not export first) on a fresh clone therefore drops packages 2 and 3 with no message, contradicting `README.md:95`: "The audio job generates every package by default."

The other filters are unvalidated in the same way:

```js
// scripts/generate_audio.mjs:182-184
function selectedLocales(content) {
	return Object.keys(content).filter((locale) => !ONLY_LOCALE || locale === ONLY_LOCALE);
}
```

```js
// scripts/generate_audio.mjs:198
const voices = voicePlan(locale).filter((voice) => !ONLY_VOICE || voice.id === ONLY_VOICE);
```

`--package p9`, `--locale dee` or `--voice chiara --locale ro` yields empty loops, `main()` still runs the SFX/music phase and returns 0. The usage line (`scripts/generate_audio.mjs:21`) advertises `--package p1|p2|p3` but the flag is never checked against that set. Because `wordClip` also skips existing files, a run with the wrong filter is indistinguishable from a run with nothing to do.

## Suggested fix

Validate the flags and count what was produced:

```js
if (ONLY_PACKAGE && !PACKAGES.some((p) => p.id === ONLY_PACKAGE)) throw new Error(`unknown package ${ONLY_PACKAGE}`);
if (ONLY_LOCALE && !LOCALES.includes(ONLY_LOCALE)) throw new Error(`unknown locale ${ONLY_LOCALE}`);
...
const skipped = PACKAGES.filter((pkg) => !existsSync(pkg.content)).map((p) => p.id);
if (skipped.length) throw new Error(`${skipped.join(', ')} content missing; run pnpm content:export`);
```

and make `generateWords()` return the number of clips written, failing when the selection is empty.

## Test

`node scripts/generate_audio.mjs --all --package p9` must exit non-zero with `unknown package p9`. Temporarily rename `scripts/content.p3.json` and run `--all`: it must exit non-zero naming the missing export instead of silently finishing. Then restore and confirm the normal run reports a written count.
