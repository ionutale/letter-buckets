# Asset validator never checks the 1,800 alternate-narrator clips

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/validate_assets.mjs:64`
- **Confidence:** certain

## What happens

`validate_assets.mjs` validates existence, size and duration only for the unsegmented default voice. The four alternate Italian narrators (`chiara`, `marco`, `lucia`, `giovane`, 1,800 clips) are never opened, so a silent, corrupt or 5-second Marco clip passes `assets valid` and ships. The README and the release ticket present this script as the asset gate.

## Evidence

The audio loop has three fixed dimensions — package, locale, word index — and no voice dimension:

```js
// scripts/validate_assets.mjs:55-69
for (const locale of locales) {
	for (const level of content[locale].levels) {
		for (let index = 0; index < 3; index++) {
			const clue = `${pkg.art}/words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
			...
			const clip = `${pkg.audio}/${locale}/l${pad(level.id)}-w${index + 1}.mp3`;
			if (!existsSync(clip)) {
				issues.push(`missing clip ${clip}`);
				continue;
			}
			if (statSync(clip).size > 20 * 1024) issues.push(`clip over 20 KB: ${clip}`);
			...ffprobe duration...
```

`pkg.audio` is `static/audio/words`, so the checked path is always `static/audio/words/it/l01-w1.mp3`. The alternate voices live at `static/audio/words/it/chiara/l01-w1.mp3` (see `src/lib/content/voices.ts:36-38` and the generator's `voicePlan`, `scripts/generate_audio.mjs:171-180`), and 4 × 3 packages × 150 = 1,800 such clips exist on disk. `scripts/check_build_size.mjs:56-58` proves the pipeline expects exactly 1,800 of them, so they are release-critical, yet the only tool that inspects clip content skips them.

The README reinforces the false sense of coverage: `README.md:91` advertises `node scripts/validate_assets.mjs # 50 theme images, 750 word clues, 750 clips, effects, music`, and `issues/05-release-validation.md:23` records `assets valid` as the release evidence. Even with `--packages`, which lifts the checked total to 2,250 clips, the 1,800 alternate-narrator clips are never opened.

`check_build_size` does count them, so a _deleted_ alt-voice clip is caught after `pnpm build`; a present-but-broken one is not.

## Suggested fix

Iterate the voices for `it`, mirroring the generator and the manifest builder:

```js
const VOICES = JSON.parse(readFileSync('scripts/voices.json', 'utf8'));
const voicesFor = (locale) => (locale === 'it' ? VOICES.italian : [{ id: 'default' }]);
...
for (const voice of voicesFor(locale)) {
	const segment = locale === 'it' && voice.id !== VOICES.default ? `${voice.id}/` : '';
	const clip = `${pkg.audio}/${locale}/${segment}l${pad(level.id)}-w${index + 1}.mp3`;
```

Report a summary per package/locale/voice so the counts are visible, and state the real total in `README.md:91` (2,550 word clips with `--packages`).

## Test

`cp static/audio/words/it/marco/l07-w2.mp3 /tmp/ && : > static/audio/words/it/marco/l07-w2.mp3`, then `node scripts/validate_assets.mjs` must report `unreadable clip` / `clip duration …` and exit 1. Restore the file and confirm `assets valid` plus a per-voice summary line.
