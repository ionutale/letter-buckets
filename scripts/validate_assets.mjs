import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import {
	THEME_PROMPTS,
	THEME_PROMPTS_P2,
	THEME_PROMPTS_P3,
	THEME_PROMPT_EXCEPTIONS,
	themePromptDrift
} from '../src/lib/content/themes.ts';

const imagesOnly = process.argv.includes('--images-only');
// Package 2 and 3 art and audio are produced later than Package 1, so they are
// opt-in: `--packages` validates what exists for every package.
const allPackages = process.argv.includes('--packages');
const locales = ['ro', 'it', 'en', 'de', 'ru'];
const issues = [];

const pad = (n) => String(n).padStart(2, '0');

const VOICES = JSON.parse(readFileSync('scripts/voices.json', 'utf8'));

/** Only Italian stores clips per narrator; the others have one default voice. */
function voicesFor(locale) {
	return locale === 'it' ? VOICES.italian : [{ id: 'default' }];
}

function voiceFolder(locale, voice) {
	return locale === 'it' && voice !== VOICES.default ? `${voice}/` : '';
}

const PACKAGES = [
	{
		id: 'p1',
		content: 'scripts/content.json',
		art: 'static/art',
		audio: 'static/audio/words',
		required: true
	},
	{
		id: 'p2',
		content: 'scripts/content.p2.json',
		art: 'static/art/p2',
		audio: 'static/audio/p2/words',
		required: false
	},
	{
		id: 'p3',
		content: 'scripts/content.p3.json',
		art: 'static/art/p3',
		audio: 'static/audio/p3/words',
		required: false
	}
].filter((pkg) => pkg.required || allPackages);

const PROMPTS = {
	p1: THEME_PROMPTS,
	p2: THEME_PROMPTS_P2,
	p3: THEME_PROMPTS_P3
};

for (const pkg of PACKAGES) {
	if (!existsSync(pkg.content)) {
		issues.push(`missing content export ${pkg.content}`);
		continue;
	}
	const content = JSON.parse(readFileSync(pkg.content, 'utf8'));

	for (let level = 1; level <= 50; level++) {
		const image = `${pkg.art}/levels/l${pad(level)}.webp`;
		if (!existsSync(image)) {
			issues.push(`missing illustration ${image}`);
		} else if (statSync(image).size > 90 * 1024) {
			issues.push(`illustration over 90 KB: ${image}`);
		}
	}

	if (imagesOnly) continue;

	for (const locale of locales) {
		for (const level of content[locale].levels) {
			for (let index = 0; index < 3; index++) {
				const clue = `${pkg.art}/words/${locale}/l${pad(level.id)}-w${index + 1}.webp`;
				if (!existsSync(clue)) {
					issues.push(`missing word illustration ${clue}`);
				} else if (statSync(clue).size > 30 * 1024) {
					issues.push(`word illustration over 30 KB: ${clue}`);
				}
			}
		}
	}

	const summaries = [];
	for (const locale of locales) {
		for (const voice of voicesFor(locale)) {
			let checked = 0;
			for (const level of content[locale].levels) {
				for (let index = 0; index < 3; index++) {
					const clip = `${pkg.audio}/${locale}/${voiceFolder(locale, voice.id)}l${pad(level.id)}-w${index + 1}.mp3`;
					checked += 1;
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
						if (!Number.isFinite(duration) || duration < 0.15 || duration > 4) {
							issues.push(`clip duration ${duration}s: ${clip}`);
						}
					} catch {
						issues.push(`unreadable clip ${clip}`);
					}
				}
			}
			summaries.push(`${locale}/${voice.id}=${checked}`);
		}
	}
	console.log(`${pkg.id} clips checked: ${summaries.join(' ')}`);
}

if (!imagesOnly) {
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

	// A level prompt sets the scene for the three words the level asks for, so
	// a word-list change must not leave the prompt describing the old words.
	for (const pkg of PACKAGES) {
		if (!existsSync(pkg.content)) continue;
		const levels = JSON.parse(readFileSync(pkg.content, 'utf8')).en.levels;
		const prompts = PROMPTS[pkg.id];
		const exceptions = THEME_PROMPT_EXCEPTIONS[pkg.id] ?? [];
		if (prompts.length !== levels.length) {
			issues.push(`${pkg.id}: ${levels.length} levels but ${prompts.length} theme prompts`);
		}
		levels.forEach((level, index) => {
			const prompt = prompts[index];
			if (!prompt) {
				issues.push(`${pkg.id} level ${level.id}: no theme prompt`);
				return;
			}
			const words = level.words.map((entry) => entry.word);
			const unnamed = themePromptDrift(prompt, words);
			const excused = exceptions.includes(level.id);
			if (unnamed.length === words.length && !excused) {
				issues.push(
					`${pkg.id} level ${level.id}: prompt names none of ${words.join('/')}: "${prompt}"`
				);
			} else if (unnamed.length < words.length && excused) {
				issues.push(
					`${pkg.id} level ${level.id}: prompt now names a word; remove it from THEME_PROMPT_EXCEPTIONS`
				);
			}
		});
	}
}

if (issues.length > 0) {
	console.error(issues.slice(0, 25).join('\n'));
	console.error(`\n${issues.length} asset issue(s)`);
	process.exit(1);
}
console.log('assets valid');
