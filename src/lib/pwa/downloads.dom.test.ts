import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FLAGS_KEY = 'letter-buckets-downloads';
const SAVE_KEY = 'letter-buckets-save';

function manifest(files: { path: string; bytes: number; level: number }[]): Response {
	const total = files.reduce((sum, file) => sum + file.bytes, 0);
	return new Response(JSON.stringify({ total, files }), { status: 200 });
}

function seedSave(clearedThrough: number): void {
	localStorage.setItem(
		SAVE_KEY,
		JSON.stringify({ version: 1, settings: {}, locales: { en: { clearedThrough } } })
	);
}

async function flush(times = 20): Promise<void> {
	for (let index = 0; index < times; index++) await Promise.resolve();
}

function flags(): string {
	return localStorage.getItem(FLAGS_KEY) ?? '';
}

function requests(fetchMock: ReturnType<typeof vi.fn>, path: string): number {
	return fetchMock.mock.calls.filter((call) => String(call[0]) === path).length;
}

describe('progressive downloads', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.useRealTimers();
		localStorage.clear();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('keeps downloading the rest of the queue when one cache write fails', async () => {
		vi.useFakeTimers();
		const files = Array.from({ length: 5 }, (_, index) => ({
			path: `/art/levels/l0${index + 1}.webp`,
			bytes: 10,
			level: index + 1
		}));
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = String(input);
			return path.startsWith('/manifests/') ? manifest(files) : new Response('ok');
		});
		const put = vi.fn(async (path: string) => {
			if (String(path).endsWith('l02.webp')) throw new Error('quota');
		});
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put }) });

		const { ensureDownloads, downloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();

		// The batch that hit the failed write must not strand the files after it.
		expect(requests(fetchMock, '/art/levels/l04.webp')).toBe(1);
		expect(requests(fetchMock, '/art/levels/l05.webp')).toBe(1);

		await vi.advanceTimersByTimeAsync(60_000);

		// The bad file is retried a bounded number of times, then reported failed.
		expect(requests(fetchMock, '/art/levels/l02.webp')).toBeLessThanOrEqual(4);
		expect(downloads.progress.active).toBe(false);
		expect(downloads.progress.failed).toBe(true);
		// A package with a missing file is not "done".
		expect(flags()).not.toContain('p1:en:default');
	});

	it('recovers when opening the cache fails, so a later run can start', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
			String(input).startsWith('/manifests/')
				? manifest([{ path: '/art/levels/l01.webp', bytes: 10, level: 1 }])
				: new Response('ok')
		);
		const open = vi.fn().mockRejectedValue(new Error('storage blocked'));
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open });

		const { ensureDownloads, downloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();

		expect(downloads.progress.active).toBe(false);

		await ensureDownloads();
		await flush();

		// The queue guard must have been released, so the second run really tries.
		expect(open).toHaveBeenCalledTimes(2);
	});

	it('gives up on a permanently failing file instead of retrying forever', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = String(input);
			if (path.startsWith('/manifests/')) {
				return manifest([{ path: '/audio/words/en/l01-w1.mp3', bytes: 10, level: 1 }]);
			}
			return new Response('missing', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put: vi.fn() }) });

		const { ensureDownloads, downloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();

		for (let round = 0; round < 10; round++) await vi.advanceTimersByTimeAsync(60_000);

		expect(requests(fetchMock, '/audio/words/en/l01-w1.mp3')).toBeLessThanOrEqual(4);
		expect(requests(fetchMock, '/audio/words/en/l01-w1.mp3')).toBeGreaterThan(1);
		expect(downloads.progress.active).toBe(false);
		expect(downloads.progress.failed).toBe(true);
	});

	it('does not mark a package done until its last file is stored', async () => {
		seedSave(0);
		let releaseFirst!: () => void;
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		let releaseLast!: () => void;
		const lastGate = new Promise<void>((resolve) => {
			releaseLast = resolve;
		});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = String(input);
			if (path === '/manifests/p1/en/default.json') {
				return manifest([{ path: '/p1-a', bytes: 1, level: 1 }]);
			}
			if (path === '/manifests/p2/en/default.json') {
				return manifest([
					{ path: '/p2-a', bytes: 1, level: 1 },
					{ path: '/p2-b', bytes: 1, level: 2 },
					{ path: '/p2-c', bytes: 1, level: 3 },
					{ path: '/p2-d', bytes: 1, level: 4 }
				]);
			}
			if (path === '/p1-a') {
				await firstGate;
				return new Response('a');
			}
			if (path === '/p2-d') {
				await lastGate;
				return new Response('d');
			}
			return new Response('ok');
		});
		const put = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put }) });

		const { ensureDownloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();

		// Package 2 unlocks while package 1 is still downloading.
		seedSave(50);
		await ensureDownloads();
		await flush();
		expect(requests(fetchMock, '/manifests/p2/en/default.json')).toBe(1);

		releaseFirst();
		await flush(40);
		expect(flags()).not.toContain('p2:en:default');

		releaseLast();
		await flush(40);
		expect(flags()).toContain('p2:en:default');
	});

	it('retries a 5xx manifest instead of marking the package done', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn(async () => new Response('nope', { status: 503 }));
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put: vi.fn() }) });

		const { ensureDownloads, downloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();
		expect(flags()).not.toContain('p1:en:default');

		await vi.advanceTimersByTimeAsync(300_000);

		expect(requests(fetchMock, '/manifests/p1/en/default.json')).toBeLessThanOrEqual(4);
		expect(requests(fetchMock, '/manifests/p1/en/default.json')).toBeGreaterThan(1);
		expect(flags()).not.toContain('p1:en:default');
		expect(downloads.progress.failed).toBe(true);
	});

	it('still treats a 404 manifest as nothing to download', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put: vi.fn() }) });

		const { ensureDownloads, downloads } = await import('./downloads.svelte.js');
		await ensureDownloads();
		await flush();

		expect(flags()).toContain('p1:en:default');
		expect(downloads.progress.failed).toBe(false);
	});
});
