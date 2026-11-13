import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const SAMPLE = args.has('--sample');
const ALL = args.has('--all') || SAMPLE;
if (!ALL) {
	console.error('usage: node scripts/generate_audio.mjs --all | --sample [--force]');
	process.exit(2);
}

const STUDIO = process.env.STUDIO_URL ?? 'http://127.0.0.1:7910';
const TOKEN_PATH = resolve(process.cwd(), '../music-sfx-voice-studio/data/token');
const TOKEN = process.env.STUDIO_TOKEN ?? readFileSync(TOKEN_PATH, 'utf8').trim();
const PIPER_BIN = process.env.PIPER_BIN ?? 'piper';
const PIPER_VOICE =
	process.env.PIPER_VOICE ?? resolve(homedir(), 'piper-voices/ro_RO-mihai-medium.onnx');
const CONTENT = JSON.parse(readFileSync('scripts/content.json', 'utf8'));
const TMP = resolve('candidates/audio-tmp');
mkdirSync(TMP, { recursive: true });

const LANGUAGES = {
	en: 'English',
	it: 'Italian',
	de: 'German',
	ru: 'Russian'
};

const pad = (value) => String(value).padStart(2, '0');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function studio(path, body) {
	for (let attempt = 0; attempt < 30; attempt++) {
		const response = await fetch(`${STUDIO}${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
			body: JSON.stringify(body)
		});
		if (response.status === 409) {
			const wait = Number(response.headers.get('retry-after') ?? 2) * 1000;
			await sleep(wait);
			continue;
		}
		if (!response.ok) {
			throw new Error(`${path} -> ${response.status} ${await response.text()}`);
		}
		return response.json();
	}
	throw new Error(`${path}: still busy after 30 retries`);
}

async function take(url) {
	const response = await fetch(`${STUDIO}${url}`, {
		headers: { authorization: `Bearer ${TOKEN}` }
	});
	if (!response.ok) throw new Error(`take ${url} -> ${response.status}`);
	return Buffer.from(await response.arrayBuffer());
}

function convert(input, output, { music = false, sfx = false } = {}) {
	mkdirSync(dirname(output), { recursive: true });
	const filter =
		'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
		'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
		'loudnorm=I=-18:TP=-3';
	const ff = ['-y', '-loglevel', 'error', '-i', input, '-ac', '1', '-ar', '24000'];
	if (!music) ff.push('-af', filter);
	if (sfx) ff.push('-t', '3');
	ff.push('-codec:a', 'libmp3lame', '-b:a', music ? '64k' : '48k', output);
	const result = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
	if (result.status !== 0) throw new Error(`ffmpeg failed for ${output}`);
}

function piperWav(text) {
	const output = resolve(TMP, `piper-${Date.now()}.wav`);
	const result = spawnSync(PIPER_BIN, ['--model', PIPER_VOICE, '--output_file', output], {
		input: text,
		encoding: 'utf8'
	});
	if (result.status !== 0 || !existsSync(output)) {
		throw new Error(
			`Piper failed. Install piper-tts and download ro_RO-mihai-medium to ${PIPER_VOICE}.`
		);
	}
	return output;
}

async function qwenWav(text, locale) {
	const language = LANGUAGES[locale];
	if (!language) throw new Error(`No Qwen language for ${locale}`);
	const result = await studio('/voice', {
		text,
		voice: 'serena',
		instruct: 'warm, gentle, clear, unhurried, for a young child',
		language,
		seconds: 3
	});
	const data = await take(result.url);
	const output = resolve(TMP, `qwen-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
	writeFileSync(output, data);
	return output;
}

async function wordClip(locale, level, index, output) {
	if (existsSync(output) && !FORCE) {
		console.log(`skip ${output}`);
		return;
	}
	const entry = CONTENT[locale].levels[level - 1].words[index];
	const text = entry.spoken ?? entry.word.toLowerCase();
	const wav = locale === 'ro' ? piperWav(text) : await qwenWav(text, locale);
	convert(wav, output);
	rmSync(wav, { force: true });
	console.log(`wrote ${output}`);
}

async function generateWords() {
	for (const locale of Object.keys(CONTENT)) {
		if (SAMPLE) {
			const output = `candidates/audio/${locale}-sample.mp3`;
			const entry = CONTENT[locale].levels[0].words[0];
			const text = entry.spoken ?? entry.word.toLowerCase();
			const wav = locale === 'ro' ? piperWav(text) : await qwenWav(text, locale);
			convert(wav, output);
			rmSync(wav, { force: true });
			console.log(`wrote ${output}`);
			continue;
		}
		for (const level of CONTENT[locale].levels) {
			for (let index = 0; index < 3; index++) {
				const output = `static/audio/words/${locale}/l${pad(level.id)}-w${index + 1}.mp3`;
				await wordClip(locale, level.id, index, output);
			}
		}
	}
}

async function sfx(preset, ms) {
	const output = `static/audio/sfx/${preset}.mp3`;
	if (existsSync(output) && !FORCE) return;
	const result = await studio('/sfx', { preset, duration_ms: ms, gain: 0.8 });
	const data = await take(result.url);
	const wav = resolve(TMP, `${preset}.wav`);
	writeFileSync(wav, data);
	convert(wav, output, { sfx: true });
	rmSync(wav, { force: true });
	console.log(`wrote ${output}`);
}

async function textSfx(name, prompt) {
	const output = `static/audio/sfx/${name}.mp3`;
	if (existsSync(output) && !FORCE) return;
	const result = await studio('/sfx/text', { prompt, seconds: 3, seed: 7 });
	const data = await take(result.url);
	const wav = resolve(TMP, `${name}.wav`);
	writeFileSync(wav, data);
	convert(wav, output, { sfx: true });
	rmSync(wav, { force: true });
	console.log(`wrote ${output}`);
}

async function music() {
	const output = 'static/audio/music/loop.mp3';
	if (existsSync(output) && !FORCE) return;
	const result = await studio('/music', {
		prompt:
			'gentle playful acoustic loop, soft marimba and ukulele, 90 bpm, no vocals, quiet, loopable',
		seconds: 25,
		seed: 11
	});
	const data = await take(result.url);
	const wav = resolve(TMP, 'music.wav');
	writeFileSync(wav, data);
	convert(wav, output, { music: true });
	rmSync(wav, { force: true });
	console.log(`wrote ${output}`);
}

async function main() {
	const health = await fetch(`${STUDIO}/health`).catch(() => null);
	if (!health?.ok) {
		throw new Error(
			`Audio studio is not running at ${STUDIO}. Start music-sfx-voice-studio first.`
		);
	}
	await generateWords();
	if (SAMPLE) return;
	await sfx('tile-pick', 90);
	await sfx('tile-place', 130);
	await sfx('tile-wrong', 180);
	await sfx('ui-tap', 60);
	await sfx('coin', 380);
	await textSfx('bucket-open', 'wooden bucket lid pop, soft, warm, short');
	await textSfx('word-complete', 'gentle warm chime, short, child-friendly');
	await textSfx('level-complete', 'small celebratory sparkle flourish, warm, short, not loud');
	await music();
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
