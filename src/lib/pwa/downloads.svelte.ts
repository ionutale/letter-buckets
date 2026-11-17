/**
 * Progressive asset downloads.
 *
 * A first install ships only the shell. Everything else — level art, clues,
 * clips, whole packages — is fetched here in level order, three at a time. The
 * service worker stores each response on the way through, so a finished queue
 * is also the offline cache.
 *
 * Nothing here blocks play: a missing file simply streams in when requested.
 */
import { version } from '$app/env';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Locale, PackageId } from '#lib/content/schema.js';
import { resolveVoice } from '#lib/content/voices.js';
import {
	currentLevel,
	isPackageUnlocked,
	loadSave,
	resolveActivePackage
} from '#lib/storage/save.js';

interface ManifestFile {
	path: string;
	bytes: number;
	level: number;
}

interface Manifest {
	total: number;
	files: ManifestFile[];
}

interface Job {
	file: ManifestFile;
	key: string;
	pkg: PackageId;
	/** Failed downloads so far, so a permanent failure cannot loop forever. */
	attempts: number;
}

export interface DownloadProgress {
	active: boolean;
	done: number;
	total: number;
	/** Package being downloaded, so the bar can name it. */
	pkg: PackageId | null;
	/** Some files could not be stored; they are retried on a later visit. */
	failed: boolean;
}

type ManifestOutcome = 'queued' | 'idle' | 'retry' | 'failed';

const FLAGS_KEY = 'letter-buckets-downloads';
const CONCURRENCY = 3;
/** Far enough ahead to sort after every real level. */
const BEYOND = 1000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 60000;

let progress = $state<DownloadProgress>({
	active: false,
	done: 0,
	total: 0,
	pkg: null,
	failed: false
});
/** Packages whose manifest has been queued and is not finished yet. */
const started = new Set<string>();
/** Files still to store per flag key, kept live so late jobs count too. */
const remaining = new Map<string, number>();
/** Manifest attempts per key, so a bad response is retried but not forever. */
const manifestAttempts = new Map<string, number>();
/** Package keys with at least one file given up on: never mark these done. */
const lostKeys = new Set<string>();
let queue: Job[] = [];
let running = false;
let queueTimer: ReturnType<typeof setTimeout> | null = null;
let manifestTimer: ReturnType<typeof setTimeout> | null = null;
let queueRound = 0;
let manifestRound = 0;
let manifestRetrying = false;
let lastLevel: number | undefined;

export const downloads = {
	get progress() {
		return progress;
	}
};

function flags(): { version: string; done: string[] } {
	try {
		const raw = localStorage.getItem(FLAGS_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		if (
			parsed &&
			parsed.version === version &&
			Array.isArray(parsed.done) &&
			parsed.done.every((item: unknown) => typeof item === 'string')
		) {
			return parsed as { version: string; done: string[] };
		}
	} catch {
		// Private mode or corrupt data: start clean.
	}
	return { version, done: [] };
}

function remember(key: string): void {
	const state = flags();
	if (state.done.includes(key)) return;
	state.done.push(key);
	try {
		localStorage.setItem(FLAGS_KEY, JSON.stringify({ version, done: state.done }));
	} catch {
		// Private mode: the cache still holds the files.
	}
}

function voiceKey(locale: Locale, voice: string): string {
	return locale === 'it' ? voice : 'default';
}

/** Current level first, then forward to 50, then anything already passed. */
function byLevel(file: ManifestFile, startLevel: number): number {
	return file.level >= startLevel ? file.level - startLevel : BEYOND + file.level;
}

/**
 * The page writes into the same cache the service worker reads, so a file is
 * kept whether or not the worker has taken control yet. The name matches
 * `src/service-worker.ts`; both use `$app/env`'s version.
 */
async function store(cache: Cache, path: string): Promise<void> {
	const response = await fetch(path);
	if (!response.ok) throw new Error(`${path} -> ${response.status}`);
	await cache.put(path, response);
}

/** Storage may be blocked or gone; that is a bad run, not a wedged queue. */
async function openCache(): Promise<Cache | null> {
	try {
		return await caches.open(`letter-buckets-${version}`);
	} catch {
		return null;
	}
}

function enqueue(pkg: PackageId, key: string, file: ManifestFile): void {
	queue.push({ file, key, pkg, attempts: 0 });
	remaining.set(key, (remaining.get(key) ?? 0) + 1);
}

/** One file stored: the package is done only when nothing is left for it. */
function settle(job: Job): void {
	progress.done += job.file.bytes;
	const left = Math.max(0, (remaining.get(job.key) ?? 0) - 1);
	remaining.set(job.key, left);
	if (left > 0) return;
	remaining.delete(job.key);
	started.delete(job.key);
	if (lostKeys.has(job.key)) return;
	remember(job.key);
}

/** One file given up on: drop it from the count without marking the package. */
function lose(job: Job): void {
	progress.failed = true;
	lostKeys.add(job.key);
	const left = Math.max(0, (remaining.get(job.key) ?? 0) - 1);
	remaining.set(job.key, left);
	if (left > 0) return;
	remaining.delete(job.key);
	started.delete(job.key);
}

function scheduleQueueRetry(): void {
	if (queueTimer !== null) return;
	const delay = Math.min(RETRY_BASE_MS * 2 ** queueRound, RETRY_MAX_MS);
	queueRound += 1;
	queueTimer = setTimeout(() => {
		queueTimer = null;
		void runQueue();
	}, delay);
}

async function runQueue(): Promise<void> {
	if (running) return;
	running = true;
	progress.active = true;
	progress.failed = false;
	/** Storage refused to open: every queued job spent one attempt. */
	let cacheBlocked = false;
	const failures: Job[] = [];

	try {
		const cache = await openCache();
		if (!cache) {
			cacheBlocked = true;
		} else {
			while (queue.length > 0) {
				const batch = queue.splice(0, CONCURRENCY);
				progress.pkg = batch[0].pkg;
				const results = await Promise.allSettled(
					batch.map(async (job) => {
						await store(cache, job.file.path);
						return job;
					})
				);

				results.forEach((result, index) => {
					if (result.status === 'rejected') failures.push(batch[index]);
					else settle(result.value);
				});
				// A failed batch never stops the files after it: they are
				// attempted in this same run and only the failures are parked.
			}
		}
	} catch {
		// Unexpected failure (for example the cache vanishing mid-run): keep
		// whatever is left for the bounded retry below.
		cacheBlocked = true;
	} finally {
		running = false;
		progress.active = false;

		const spent = cacheBlocked ? queue : failures;
		if (cacheBlocked) queue = [];

		const parked: Job[] = [];
		for (const job of spent) {
			job.attempts += 1;
			if (job.attempts >= MAX_ATTEMPTS) lose(job);
			else parked.push(job);
		}
		queue = [...parked, ...queue];

		if (queue.length === 0) {
			queueRound = 0;
			// Only a clean run may claim the total was downloaded.
			if (!progress.failed) progress.done = progress.total;
		} else {
			scheduleQueueRetry();
		}
	}
}

function manifestFailure(key: string): ManifestOutcome {
	const attempts = (manifestAttempts.get(key) ?? 0) + 1;
	manifestAttempts.set(key, attempts);
	started.delete(key);
	// Never remember the key here: an error must not look like "downloaded".
	return attempts < MAX_ATTEMPTS ? 'retry' : 'failed';
}

async function addManifest(
	pkg: PackageId,
	locale: Locale,
	voice: string,
	startLevel: number
): Promise<ManifestOutcome> {
	const key = `${pkg}:${locale}:${voiceKey(locale, voice)}`;
	if (flags().done.includes(key) || started.has(key)) return 'idle';
	started.add(key);

	let response: Response;
	try {
		response = await fetch(`/manifests/${pkg}/${locale}/${voiceKey(locale, voice)}.json`);
	} catch {
		// Network error: retry later, the package is not done.
		return manifestFailure(key);
	}

	if (response.status === 404) {
		// Nothing generated for this package yet: treat it as complete.
		remember(key);
		started.delete(key);
		return 'idle';
	}
	if (!response.ok) {
		// 5xx, 403, 429: unavailable right now, but not something to remember.
		return manifestFailure(key);
	}

	let manifest: Manifest;
	try {
		manifest = (await response.json()) as Manifest;
	} catch {
		return manifestFailure(key);
	}

	manifestAttempts.delete(key);
	manifestRound = 0;
	lostKeys.delete(key);
	const files = [...manifest.files].sort((a, b) => byLevel(a, startLevel) - byLevel(b, startLevel));
	for (const file of files) enqueue(pkg, key, file);

	progress.total += manifest.total;
	return files.length > 0 ? 'queued' : 'idle';
}

function scheduleManifestRetry(): void {
	if (manifestTimer !== null) return;
	const delay = Math.min(RETRY_BASE_MS * 2 ** manifestRound, RETRY_MAX_MS);
	manifestRound += 1;
	manifestTimer = setTimeout(() => {
		manifestTimer = null;
		manifestRetrying = true;
		void ensureDownloads(lastLevel).finally(() => {
			manifestRetrying = false;
		});
	}, delay);
}

/**
 * Queues everything the player should have: Package 1 for the active language
 * and narrator, plus any package that has unlocked.
 */
export async function ensureDownloads(startLevel?: number): Promise<void> {
	const locale = getLocale() as Locale;
	const main = loadSave(localStorage);
	const voice = resolveVoice(locale, main.settings.voice);
	const level = startLevel ?? currentLevel(main, locale);
	const active = resolveActivePackage(localStorage, locale);
	lastLevel = level;

	// A player-driven call (a level finishing, the page coming back online)
	// earns a fresh manifest budget; the scheduled retry does not, so a broken
	// deploy cannot be polled forever.
	if (!manifestRetrying) {
		manifestAttempts.clear();
		progress.failed = false;
	}

	const packages: PackageId[] = ['p1'];
	if (isPackageUnlocked(main, locale, 'p2')) packages.push('p2');
	if (isPackageUnlocked(loadSave(localStorage, 'p2'), locale, 'p3')) packages.push('p3');
	// The package being played goes first.
	if (active !== 'p1') packages.sort((a, b) => (a === active ? -1 : b === active ? 1 : 0));

	let queued = false;
	let retryManifest = false;
	let failedManifest = false;
	for (const pkg of packages) {
		const outcome = await addManifest(pkg, locale, voice, level);
		if (outcome === 'queued') queued = true;
		else if (outcome === 'retry') retryManifest = true;
		else if (outcome === 'failed') failedManifest = true;
	}
	if (failedManifest) progress.failed = true;
	if (queued || queue.length > 0) void runQueue();
	if (retryManifest) scheduleManifestRetry();
}
