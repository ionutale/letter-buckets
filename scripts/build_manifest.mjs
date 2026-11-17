// Builds one download manifest per package, language and narrator.
//
// Each manifest lists the files that actually exist on disk, ordered per level:
// the level illustration first, then each clue followed by its own clip. The
// app downloads them in that order so the next level is ready before it opens.
//
// Every manifest has a known size (one illustration plus a clue and a clip per
// word), so a short manifest is reported and fails the build instead of being
// published as if it were complete.
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('static');
const out = resolve(root, 'manifests');
rmSync(out, { recursive: true, force: true });

const PACKAGES = [
	{ id: 'p1', content: 'scripts/content.json', art: '', audio: '' },
	{ id: 'p2', content: 'scripts/content.p2.json', art: 'p2/', audio: 'p2/' },
	{ id: 'p3', content: 'scripts/content.p3.json', art: 'p3/', audio: 'p3/' }
];
const VOICES = JSON.parse(readFileSync('scripts/voices.json', 'utf8'));
const pad = (value) => String(value).padStart(2, '0');

/** The narrator folder for a locale; only Italian stores clips per voice. */
function voiceFolder(locale, voice) {
	return locale === 'it' && voice !== VOICES.default ? `${voice}/` : '';
}

function voicesFor(locale) {
	return locale === 'it' ? VOICES.italian : [{ id: 'default' }];
}

const written = [];
const skipped = [];
for (const pkg of PACKAGES) {
	if (!existsSync(pkg.content)) {
		skipped.push(pkg.id);
		continue;
	}
	const content = JSON.parse(readFileSync(pkg.content, 'utf8'));
	const packageWritten = [];

	for (const locale of Object.keys(content)) {
		for (const voice of voicesFor(locale)) {
			const files = [];
			const missing = [];
			let expected = 0;

			for (const level of content[locale].levels) {
				expected += 1;
				const levelPlate = `${root}/art/${pkg.art}levels/l${pad(level.id)}.webp`;
				const platePath = `/art/${pkg.art}levels/l${pad(level.id)}.webp`;
				if (existsSync(levelPlate)) {
					files.push({ path: platePath, bytes: statSync(levelPlate).size, level: level.id });
				} else {
					missing.push(platePath);
				}
				for (let index = 0; index < level.words.length; index++) {
					const clue = `/art/${pkg.art}words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
					const clip = `/audio/${pkg.audio}words/${locale}/${voiceFolder(locale, voice.id)}l${pad(level.id)}-w${index + 1}.mp3`;
					for (const asset of [clue, clip]) {
						expected += 1;
						const file = `${root}${asset}`;
						if (existsSync(file)) {
							files.push({ path: asset, bytes: statSync(file).size, level: level.id });
						} else {
							missing.push(asset);
						}
					}
				}
			}

			const label = `${pkg.id}/${locale}/${voice.id}`;
			if (files.length === 0) {
				console.error(`${label}: no files found, expected ${expected}; skipping manifest`);
				process.exitCode = 1;
				continue;
			}
			if (missing.length > 0) {
				console.error(
					`${label}: ${missing.length} of ${expected} files missing, manifest is incomplete`
				);
				for (const path of missing.slice(0, 5)) console.error(`  missing ${path}`);
				process.exitCode = 1;
			}

			const total = files.reduce((sum, file) => sum + file.bytes, 0);
			const dir = resolve(out, pkg.id, locale);
			mkdirSync(dir, { recursive: true });
			const key = locale === 'it' ? voice.id : 'default';
			writeFileSync(
				resolve(dir, `${key}.json`),
				JSON.stringify({ package: pkg.id, locale, voice: key, total, files })
			);
			written.push(label);
			packageWritten.push(label);
		}
	}

	if (packageWritten.length === 0) {
		console.error(`${pkg.id}: content exists but produced no manifests`);
		process.exitCode = 1;
	}
}

if (skipped.length > 0) {
	console.warn(`no content export for ${skipped.join(', ')}; run pnpm content:export`);
}
console.log(`wrote ${written.length} manifests under static/manifests`);
if (process.exitCode) console.error('manifests are incomplete; fix the missing files above');
