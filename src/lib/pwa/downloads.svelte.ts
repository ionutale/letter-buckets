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
}

export interface DownloadProgress {
	active: boolean;
	done: number;
	total: number;
	/** Package being downloaded, so the bar can name it. */
	pkg: PackageId | null;
}

const FLAGS_KEY = 'letter-buckets-downloads';
const CONCURRENCY = 3;
/** Far enough ahead to sort after every real level. */
const BEYOND = 1000;

let progress = $state<DownloadProgress>({ active: false, done: 0, total: 0, pkg: null });
const started = new Set<string>();
let queue: Job[] = [];
let running = false;
let retry: ReturnType<typeof setTimeout> | null = null;

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

async function runQueue(): Promise<void> {
	if (running) return;
	running = true;
	progress.active = true;
	const cache = await caches.open(`letter-buckets-${version}`);

	// Files left per flag key, so a package is only marked done on its last one.
	const remaining = new Map<string, number>();
	for (const job of queue) remaining.set(job.key, (remaining.get(job.key) ?? 0) + 1);

	while (queue.length > 0) {
		const batch = queue.splice(0, CONCURRENCY);
		progress.pkg = batch[0].pkg;
		const results = await Promise.allSettled(
			batch.map(async (job) => {
				await store(cache, job.file.path);
				return job;
			})
		);

		const failed: Job[] = [];
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				failed.push(batch[index]);
				return;
			}
			progress.done += result.value.file.bytes;
			const left = (remaining.get(result.value.key) ?? 1) - 1;
			remaining.set(result.value.key, left);
			if (left === 0) remember(result.value.key);
		});

		if (failed.length > 0) {
			// Offline or a bad response: keep the rest for the next visit.
			queue = [...failed, ...queue];
			break;
		}
	}

	started.clear();
	running = false;
	progress.active = false;
	if (queue.length === 0) {
		progress.done = progress.total;
	} else if (retry === null) {
		// Offline or a bad run: try again while this page stays open.
		retry = setTimeout(() => {
			retry = null;
			void runQueue();
		}, 15000);
	}
}

async function addManifest(
	pkg: PackageId,
	locale: Locale,
	voice: string,
	startLevel: number
): Promise<boolean> {
	const key = `${pkg}:${locale}:${voiceKey(locale, voice)}`;
	if (flags().done.includes(key) || started.has(key)) return false;
	started.add(key);

	let manifest: Manifest | null = null;
	for (let attempt = 0; attempt < 2 && manifest === null; attempt++) {
		try {
			const response = await fetch(`/manifests/${pkg}/${locale}/${voiceKey(locale, voice)}.json`);
			if (!response.ok) {
				// Nothing generated for this package yet: treat it as complete.
				remember(key);
				started.delete(key);
				return false;
			}
			manifest = (await response.json()) as Manifest;
		} catch {
			if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
		}
	}
	if (manifest === null) {
		started.delete(key);
		return false;
	}

	const files = [...manifest.files].sort((a, b) => byLevel(a, startLevel) - byLevel(b, startLevel));
	for (const file of files) queue.push({ file, key, pkg });

	progress.total += manifest.total;
	return files.length > 0;
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

	const packages: PackageId[] = ['p1'];
	if (isPackageUnlocked(main, locale, 'p2')) packages.push('p2');
	if (isPackageUnlocked(loadSave(localStorage, 'p2'), locale, 'p3')) packages.push('p3');
	// The package being played goes first.
	if (active !== 'p1') packages.sort((a, b) => (a === active ? -1 : b === active ? 1 : 0));

	let queued = false;
	for (const pkg of packages) {
		if (await addManifest(pkg, locale, voice, level)) queued = true;
	}
	if (queued || queue.length > 0) void runQueue();
}
