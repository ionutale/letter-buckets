import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { atomicallyReplace } from './lib/atomic-write.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const FORCE = args.has('--force');
const SAMPLE = args.has('--sample');
const SFX_ONLY = args.has('--sfx');
const ALL = args.has('--all') || SAMPLE;
function flag(name) {
	const index = argv.indexOf(`--${name}`);
	return index === -1 ? undefined : argv[index + 1];
}
const ONLY_PACKAGE = flag('package');
const ONLY_LOCALE = flag('locale');
const ONLY_VOICE = flag('voice');
if (!ALL && !SFX_ONLY) {
	console.error(
		'usage: node scripts/generate_audio.mjs --all | --sample [--force] [--package p1|p2|p3] [--locale it] [--voice chiara]'
	);
	process.exit(2);
}

const STUDIO = process.env.STUDIO_URL ?? 'http://127.0.0.1:7910';
const TOKEN_PATH = resolve(process.cwd(), '../music-sfx-voice-studio/data/token');
const TOKEN = process.env.STUDIO_TOKEN ?? readFileSync(TOKEN_PATH, 'utf8').trim();
const PIPER_BIN = process.env.PIPER_BIN ?? 'piper';
const PIPER_VOICE =
	process.env.PIPER_VOICE ?? resolve(homedir(), 'piper-voices/ro_RO-mihai-medium.onnx');
const PIPER_VOICE_RU =
	process.env.PIPER_VOICE_RU ?? resolve(homedir(), 'piper-voices/ru_RU-irina-medium.onnx');
const PIPER_LENGTH_SCALE = process.env.PIPER_LENGTH_SCALE ?? '1.2';
// Romanian uses MOSS-TTS v1.5 with a cloned reference voice: the model carries
// native pronunciation, the reference carries the timbre. It is an 8B model, so
// it runs in a worker that is started once per batch.
const MOSS_PYTHON = process.env.MOSS_PYTHON ?? resolve('.venv-moss/bin/python');
const MOSS_WORKER = resolve('scripts/moss_ro_worker.py');
const MOSS_REFERENCE =
	process.env.MOSS_REFERENCE ?? resolve('candidates/voice-clone/chunks6/chunk0.wav');
const TMP = resolve('candidates/audio-tmp');
mkdirSync(TMP, { recursive: true });

// One file per package: the app plays them from matching folders.
const PACKAGES = [
	{ id: 'p1', content: 'scripts/content.json', out: 'static/audio/words' },
	{ id: 'p2', content: 'scripts/content.p2.json', out: 'static/audio/p2/words' },
	{ id: 'p3', content: 'scripts/content.p3.json', out: 'static/audio/p3/words' }
];
const VOICES = JSON.parse(readFileSync('scripts/voices.json', 'utf8'));

const LANGUAGES = {
	en: 'English',
	it: 'Italian',
	de: 'German',
	ru: 'Russian'
};

// Qwen presets are native English/Chinese speakers; only the instruction steers
// them. Italian uses a designed native voice from the engine's library instead,
// so its instruction stays empty and the reference carries the accent.
const QWEN_VOICE = {
	en: 'serena',
	it: 'narratrice-a',
	de: 'serena'
};

// Piper voices are fixed native models, so they are configured by voice and
// slowed with --length_scale.
const VOICE_STYLE = {
	en: 'a soft Southern English',
	de: 'a gentle Bavarian'
};

function instructFor(locale) {
	const style = VOICE_STYLE[locale];
	if (!style) return '';
	return `Speak slowly and clearly in ${LANGUAGES[locale]} with ${style} accent, warm and unhurried, for a young child`;
}

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

function convert(input, output, { music = false, sfx = false, speech = false, slow = false } = {}) {
	mkdirSync(dirname(output), { recursive: true });
	const filter =
		'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
		'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
		// The cloned Romanian voice is already at a natural pace; slowing it made
		// the previous Piper voice sound foreign.
		(slow ? 'atempo=0.85,' : '') +
		'loudnorm=I=-18:TP=-3' +
		// A slow audio pipeline can drop the first frames of a clip. Leading
		// silence costs half a second but guarantees the word is not clipped.
		(speech ? ',adelay=250:all=1' : '');
	// ffmpeg writes a hidden sibling; the rename below is the only thing that
	// publishes it, so a killed run can never leave a truncated clip behind.
	atomicallyReplace(output, (temp) => {
		const ff = ['-y', '-loglevel', 'error', '-i', input, '-ac', '1', '-ar', '24000'];
		if (!music) ff.push('-af', filter);
		if (sfx) ff.push('-t', '3');
		ff.push('-codec:a', 'libmp3lame', '-b:a', music ? '64k' : '48k', temp);
		const result = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
		if (result.status !== 0) throw new Error(`ffmpeg failed for ${output}`);
	});
}

function piperWav(text, voice) {
	const output = resolve(TMP, `piper-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
	const result = spawnSync(
		PIPER_BIN,
		['--model', voice, '--length_scale', PIPER_LENGTH_SCALE, '--output_file', output],
		{ input: text, encoding: 'utf8' }
	);
	if (result.status !== 0 || !existsSync(output)) {
		throw new Error(`Piper failed for ${voice}. Install piper-tts and the voice model.`);
	}
	return output;
}

/**
 * The MOSS checkpoint is ~17 GB, so it runs in a worker that is started once and
 * fed one word at a time over stdin. Each word takes seconds; loading the model
 * per clip would take hours.
 */
let mossWorker = null;
let mossPending = [];

function startMoss() {
	if (!existsSync(MOSS_PYTHON)) {
		throw new Error(
			`missing ${MOSS_PYTHON}; run: uv venv .venv-moss --python 3.12 && uv pip install --python .venv-moss/bin/python torch torchaudio "transformers==5.0.0" accelerate soundfile librosa torchcodec`
		);
	}
	if (!existsSync(MOSS_REFERENCE)) {
		throw new Error(`missing Romanian reference recording at ${MOSS_REFERENCE}`);
	}
	const proc = spawn(MOSS_PYTHON, [MOSS_WORKER], {
		stdio: ['pipe', 'pipe', 'inherit'],
		env: { ...process.env, MOSS_REFERENCE }
	});
	const lines = createInterface({ input: proc.stdout });
	lines.on('line', (line) => {
		let message;
		try {
			message = JSON.parse(line);
		} catch {
			// Model loaders print progress to stdout; ignore anything else.
			return;
		}
		if (message.ready) return;
		const settle = mossPending.shift();
		if (settle) settle(message);
	});
	proc.on('exit', (code) => {
		const failed = mossPending;
		mossPending = [];
		for (const settle of failed) settle({ ok: false, error: `worker exited (${code})` });
		mossWorker = null;
	});
	return proc;
}

function mossWav(text) {
	mossWorker ??= startMoss();
	const wav = resolve(TMP, `moss-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
	return new Promise((resolvePromise, reject) => {
		mossPending.push((message) => {
			if (message.ok) resolvePromise(wav);
			else reject(new Error(`moss failed for "${text}": ${message.error ?? 'unknown'}`));
		});
		mossWorker.stdin.write(`${JSON.stringify({ text, wav })}\n`);
	});
}

function stopMoss() {
	mossWorker?.stdin.end();
	mossWorker = null;
}

async function qwenWav(text, locale, studioVoice) {
	const language = LANGUAGES[locale];
	if (!language || !studioVoice) throw new Error(`No Qwen voice for ${locale}`);
	const result = await studio('/voice', {
		text,
		voice: studioVoice,
		instruct: instructFor(locale),
		language,
		seconds: 4
	});
	const data = await take(result.url);
	const output = resolve(TMP, `qwen-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
	writeFileSync(output, data);
	return output;
}

async function wordClip(locale, entry, output, studioVoice) {
	if (existsSync(output) && !FORCE) {
		console.log(`skip ${output}`);
		return;
	}
	const text = entry.spoken ?? entry.word.toLowerCase();
	const wav =
		locale === 'ro'
			? await mossWav(text)
			: locale === 'ru'
				? piperWav(text, PIPER_VOICE_RU)
				: await qwenWav(text, locale, studioVoice);
	convert(wav, output, { speech: true, slow: locale !== 'ro' });
	rmSync(wav, { force: true });
	console.log(`wrote ${output}`);
}

/**
 * Voices to render for a locale. Italian has five; everything else has one.
 * The default voice stays in the flat folder, the others get a segment.
 */
function voicePlan(locale) {
	if (locale === 'it') {
		return VOICES.italian.map((voice) => ({
			id: voice.id,
			studioId: voice.studioId,
			segment: voice.id === VOICES.default ? '' : `${voice.id}/`
		}));
	}
	return [{ id: 'default', studioId: QWEN_VOICE[locale], segment: '' }];
}

function selectedLocales(content) {
	return Object.keys(content).filter((locale) => !ONLY_LOCALE || locale === ONLY_LOCALE);
}

function selectedPackages() {
	return PACKAGES.filter(
		(pkg) => (!ONLY_PACKAGE || pkg.id === ONLY_PACKAGE) && existsSync(pkg.content)
	).map((pkg) => ({
		...pkg,
		content: JSON.parse(readFileSync(pkg.content, 'utf8'))
	}));
}

async function generateWords() {
	for (const pkg of selectedPackages()) {
		for (const locale of selectedLocales(pkg.content)) {
			const voices = voicePlan(locale).filter((voice) => !ONLY_VOICE || voice.id === ONLY_VOICE);
			for (const voice of voices) {
				if (SAMPLE) {
					const output = `candidates/audio/${locale}-${voice.id}-sample.mp3`;
					const entry = pkg.content[locale].levels[0].words[0];
					const text = entry.spoken ?? entry.word.toLowerCase();
					const wav =
						locale === 'ro'
							? await mossWav(text)
							: locale === 'ru'
								? piperWav(text, PIPER_VOICE_RU)
								: await qwenWav(text, locale, voice.studioId);
					convert(wav, output, { speech: true, slow: locale !== 'ro' });
					rmSync(wav, { force: true });
					console.log(`wrote ${output}`);
					continue;
				}
				for (const level of pkg.content[locale].levels) {
					for (let index = 0; index < level.words.length; index++) {
						const output = `${pkg.out}/${locale}/${voice.segment}l${pad(level.id)}-w${index + 1}.mp3`;
						await wordClip(locale, level.words[index], output, voice.studioId);
					}
				}
			}
		}
	}
}

async function sfx(name, preset, ms) {
	const output = `static/audio/sfx/${name}.mp3`;
	if (existsSync(output) && !FORCE) return;
	const result = await studio('/sfx', { preset, duration_ms: ms, gain: 0.8 });
	const data = await take(result.url);
	const wav = resolve(TMP, `${name}.wav`);
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

/**
 * Fail fast when the selection matches nothing: a typo in --package, --locale or
 * --voice used to generate zero clips and exit successfully.
 */
function preflight() {
	if (SFX_ONLY) return;
	if (ONLY_PACKAGE && !PACKAGES.some((pkg) => pkg.id === ONLY_PACKAGE)) {
		throw new Error(
			`unknown package "${ONLY_PACKAGE}"; known packages: ${PACKAGES.map((pkg) => pkg.id).join(', ')}`
		);
	}
	const packages = selectedPackages();
	if (packages.length === 0) {
		throw new Error(
			`nothing to generate: no content exports found (${PACKAGES.map((pkg) => pkg.content).join(', ')}). Run \`pnpm content:export\` first.`
		);
	}

	let selected = 0;
	for (const pkg of packages) {
		const locales = selectedLocales(pkg.content);
		if (locales.length === 0) continue;
		for (const locale of locales) {
			const voices = voicePlan(locale).filter((voice) => !ONLY_VOICE || voice.id === ONLY_VOICE);
			if (ONLY_VOICE && voices.length === 0) {
				throw new Error(
					`unknown voice "${ONLY_VOICE}" for ${locale}; known voices: ${voicePlan(locale)
						.map((voice) => voice.id)
						.join(', ')}`
				);
			}
			selected += voices.length * pkg.content[locale].levels.length;
		}
	}

	if (selected === 0) {
		throw new Error(
			`nothing to generate for package="${ONLY_PACKAGE ?? 'all'}" locale="${ONLY_LOCALE ?? 'all'}" voice="${ONLY_VOICE ?? 'all'}"`
		);
	}
}

async function main() {
	preflight();
	// Romanian and Russian are local models; only the Qwen voices need the studio,
	// so a Romanian-only run should not fail because it is down.
	const needsStudio =
		SFX_ONLY ||
		selectedPackages().some((pkg) =>
			selectedLocales(pkg.content).some((locale) => locale !== 'ro' && locale !== 'ru')
		);
	if (needsStudio) {
		const health = await fetch(`${STUDIO}/health`).catch(() => null);
		if (!health?.ok) {
			throw new Error(
				`Audio studio is not running at ${STUDIO}. Start music-sfx-voice-studio first.`
			);
		}
	}
	try {
		if (!SFX_ONLY) await generateWords();
	} finally {
		stopMoss();
	}
	if (SAMPLE) return;
	await sfx('tile-pick', 'click', 90);
	await sfx('tile-place', 'blip', 130);
	await sfx('tile-wrong', 'error', 180);
	await sfx('ui-tap', 'click', 60);
	await sfx('coin', 'coin', 380);
	await textSfx('bucket-open', 'wooden bucket lid pop, soft, warm, short');
	await textSfx('word-complete', 'gentle warm chime, short, child-friendly');
	await textSfx('level-complete', 'small celebratory sparkle flourish, warm, short, not loud');
	await music();
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
