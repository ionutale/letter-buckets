// Copy a finished set of Romanian clips into the game's static paths.
//
// The generator writes one file per distinct word; the game needs one per word
// per level, with duplicates repeated across packages. This maps the former to
// the latter.
//
//   node scripts/install_ro_clips.mjs --label moss-prod [--dry-run]
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const labelIndex = argv.indexOf('--label');
const LABEL = labelIndex === -1 ? 'moss-prod' : argv[labelIndex + 1];
const DRY = argv.includes('--dry-run');
const SOURCE = resolve('candidates/audio/ro-clone', LABEL);

const PACKAGES = [
	{ content: 'scripts/content.json', out: 'static/audio/words' },
	{ content: 'scripts/content.p2.json', out: 'static/audio/p2/words' },
	{ content: 'scripts/content.p3.json', out: 'static/audio/p3/words' }
];

const targets = new Map();
for (const pkg of PACKAGES) {
	if (!existsSync(pkg.content)) continue;
	const data = JSON.parse(readFileSync(pkg.content, 'utf8'));
	for (const level of data.ro.levels) {
		level.words.forEach((entry, index) => {
			const word = (entry.spoken ?? entry.word).toLowerCase();
			const output = `${pkg.out}/ro/l${String(level.id).padStart(2, '0')}-w${index + 1}.mp3`;
			const list = targets.get(word) ?? [];
			list.push(output);
			targets.set(word, list);
		});
	}
}

let copied = 0;
const missing = [];
for (const [word, outputs] of targets) {
	const source = resolve(SOURCE, `${word}.mp3`);
	if (!existsSync(source)) {
		missing.push(word);
		continue;
	}
	for (const output of outputs) {
		if (!DRY) copyFileSync(source, output);
	}
	copied += outputs.length;
}

console.log(
	`${SOURCE}: ${targets.size} distinct words, ${copied} clips ${DRY ? 'would be' : ''} copied`
);
if (missing.length) {
	console.error(`missing in ${SOURCE}: ${missing.length} — ${missing.slice(0, 10).join(', ')}`);
	process.exit(1);
}
