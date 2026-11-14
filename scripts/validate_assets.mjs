import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const imagesOnly = process.argv.includes('--images-only');
const content = JSON.parse(readFileSync('scripts/content.json', 'utf8'));
const locales = ['ro', 'it', 'en', 'de', 'ru'];
const issues = [];

const pad = (n) => String(n).padStart(2, '0');

for (let level = 1; level <= 50; level++) {
	const image = `static/art/levels/l${pad(level)}.webp`;
	if (!existsSync(image)) {
		issues.push(`missing illustration ${image}`);
	} else if (statSync(image).size > 90 * 1024) {
		issues.push(`illustration over 90 KB: ${image}`);
	}
}

if (!imagesOnly) {
	for (const locale of locales) {
		for (const level of content[locale].levels) {
			for (let index = 0; index < 3; index++) {
				const clue = `static/art/words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
				if (!existsSync(clue)) {
					issues.push(`missing word illustration ${clue}`);
				} else if (statSync(clue).size > 30 * 1024) {
					issues.push(`word illustration over 30 KB: ${clue}`);
				}
				const clip = `static/audio/words/${locale}/l${pad(level.id)}-w${index + 1}.mp3`;
				if (!existsSync(clip)) {
					issues.push(`missing clip ${clip}`);
					continue;
				}
				if (statSync(clip).size > 20 * 1024) issues.push(`clip over 20 KB: ${clip}`);
				try {
					const duration = Number(
						execFileSync('ffprobe', [
							'-v',
							'error',
							'-show_entries',
							'format=duration',
							'-of',
							'default=nw=1:nk=1',
							clip
						])
							.toString()
							.trim()
					);
					if (!Number.isFinite(duration) || duration < 0.15 || duration > 3) {
						issues.push(`clip duration ${duration}s: ${clip}`);
					}
				} catch {
					issues.push(`unreadable clip ${clip}`);
				}
			}
		}
	}

	for (const sfx of [
		'tile-pick',
		'tile-place',
		'tile-wrong',
		'ui-tap',
		'bucket-open',
		'word-complete',
		'level-complete',
		'coin'
	]) {
		if (!existsSync(`static/audio/sfx/${sfx}.mp3`)) issues.push(`missing sfx ${sfx}`);
	}
	if (!existsSync('static/audio/music/loop.mp3')) issues.push('missing music loop');
}

if (issues.length > 0) {
	console.error(issues.slice(0, 25).join('\n'));
	console.error(`\n${issues.length} asset issue(s)`);
	process.exit(1);
}
console.log('assets valid');
