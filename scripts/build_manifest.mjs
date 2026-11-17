// Builds one download manifest per package, language and narrator.
//
// Each manifest lists the files that actually exist on disk, ordered per level:
// the level illustration first, then its three clues, then its three clips. The
// app downloads them in that order so the next level is ready before it opens.
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
for (const pkg of PACKAGES) {
	if (!existsSync(pkg.content)) continue;
	const content = JSON.parse(readFileSync(pkg.content, 'utf8'));

	for (const locale of Object.keys(content)) {
		for (const voice of voicesFor(locale)) {
			const files = [];
			for (const level of content[locale].levels) {
				const levelPlate = `${root}/art/${pkg.art}levels/l${pad(level.id)}.webp`;
				if (existsSync(levelPlate)) {
					files.push({
						path: `/art/${pkg.art}levels/l${pad(level.id)}.webp`,
						bytes: statSync(levelPlate).size,
						level: level.id
					});
				}
				for (let index = 0; index < level.words.length; index++) {
					const clue = `/art/${pkg.art}words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
					const clip = `/audio/${pkg.audio}words/${locale}/${voiceFolder(locale, voice.id)}l${pad(level.id)}-w${index + 1}.mp3`;
					for (const asset of [clue, clip]) {
						const file = `${root}${asset}`;
						if (existsSync(file)) {
							files.push({ path: asset, bytes: statSync(file).size, level: level.id });
						}
					}
				}
			}
			if (files.length === 0) continue;

			const total = files.reduce((sum, file) => sum + file.bytes, 0);
			const dir = resolve(out, pkg.id, locale);
			mkdirSync(dir, { recursive: true });
			const key = locale === 'it' ? voice.id : 'default';
			writeFileSync(
				resolve(dir, `${key}.json`),
				JSON.stringify({ package: pkg.id, locale, voice: key, total, files })
			);
			written.push(`${pkg.id}/${locale}/${key}`);
		}
	}
}

console.log(`wrote ${written.length} manifests under static/manifests`);
