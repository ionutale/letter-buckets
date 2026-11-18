// Prefix every word clip with silence so a slow audio pipeline cannot eat the
// first phoneme, or trim a prefix back off again.
//   node scripts/add_lead_silence.mjs --ms 250
//   node scripts/add_lead_silence.mjs --trim-ms 250
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const msIndex = args.indexOf('--ms');
const trimIndex = args.indexOf('--trim-ms');
const TRIM_MS = trimIndex === -1 ? 0 : Number(args[trimIndex + 1]);
const LEAD_MS = Number(msIndex === -1 ? (TRIM_MS > 0 ? 0 : 500) : args[msIndex + 1]);
if (TRIM_MS > 0 && (!Number.isFinite(TRIM_MS) || TRIM_MS <= 0)) {
	console.error('usage: node scripts/add_lead_silence.mjs [--ms 500 | --trim-ms 250]');
	process.exit(2);
}
if (TRIM_MS === 0 && (!Number.isFinite(LEAD_MS) || LEAD_MS <= 0)) {
	console.error('usage: node scripts/add_lead_silence.mjs [--ms 500 | --trim-ms 250]');
	process.exit(2);
}

const ROOTS = ['static/audio/words', 'static/audio/p2/words', 'static/audio/p3/words'];
const files = [];
for (const root of ROOTS) {
	let entries;
	try {
		entries = readdirSync(root, { recursive: true, withFileTypes: true });
	} catch {
		continue;
	}
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith('.mp3')) continue;
		files.push(join(entry.parentPath ?? entry.path, entry.name));
	}
}

let done = 0;
for (const file of files) {
	const temp = resolve(dirname(file), `.${file.split('/').pop()}.lead-${process.pid}.mp3`);
	const trim = TRIM_MS > 0 ? ['-ss', String(TRIM_MS / 1000)] : [];
	const result = spawnSync('ffmpeg', [
		'-y',
		'-loglevel',
		'error',
		'-i',
		file,
		...trim,
		'-ac',
		'1',
		'-ar',
		'24000',
		...(TRIM_MS > 0 ? [] : ['-af', `adelay=${LEAD_MS}:all=1`]),
		'-codec:a',
		'libmp3lame',
		'-b:a',
		'48k',
		temp
	]);
	if (result.status !== 0) {
		rmSync(temp, { force: true });
		console.error(`failed: ${file}`);
		process.exit(1);
	}
	const after = statSync(temp).size;
	if (after === 0) {
		rmSync(temp, { force: true });
		console.error(`refused to replace ${file} with an empty clip`);
		process.exit(1);
	}
	rmSync(file);
	spawnSync('mv', [temp, file]);
	done += 1;
	if (done % 200 === 0) console.log(`${done}/${files.length}`);
}

console.log(
	TRIM_MS > 0
		? `trimmed ${TRIM_MS} ms from ${done} clips`
		: `prefixed ${done} clips with ${LEAD_MS} ms of silence`
);
