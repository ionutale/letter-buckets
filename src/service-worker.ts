/// <reference types="@sveltejs/kit" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { resolve } from '$app/paths';
import { self } from '$app/service-worker';
import { decide, isDownloadedAsset } from '#lib/pwa/policy';

// One cache per deployment: a new build opens a fresh cache and the activate
// handler deletes everything else, so stale assets can never be served.
const CACHE = `letter-buckets-${version}`;
const INDEX = '/200.html';
const BATCH = 8;

// `immutable`/`assets` are relative to the base path; resolve them to
// pathnames that can be cached and matched back. Art and word audio are left
// out: the app downloads those in level order, so a first install is small.
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
].filter((path) => !isDownloadedAsset(path));

/**
 * A redirected response cannot satisfy a navigation request, so anything cached
 * for the shell is rebuilt from its body. Cloudflare answers `/200.html` with a
 * 308 to `/200`, which would otherwise poison the cache.
 */
async function cleanResponse(response: Response): Promise<Response> {
	const body = await response.arrayBuffer();
	return new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}

async function fetchShell(): Promise<Response | undefined> {
	try {
		const response = await fetch(INDEX, { redirect: 'follow' });
		return response.ok ? await cleanResponse(response) : undefined;
	} catch {
		return undefined;
	}
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			for (let i = 0; i < PRECACHE.length; i += BATCH) {
				await Promise.all(
					PRECACHE.slice(i, i + BATCH).map((url) => cache.add(url).catch(() => {}))
				);
			}
			const shell = await fetchShell();
			if (shell) await cache.put(INDEX, shell).catch(() => {});
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			// Take over open pages so the reload that follows an update is
			// served by this worker instead of the outgoing one.
			.then(() => self.clients.claim())
	);
});

// The update toast asks a waiting worker to take over immediately; the page
// reloads itself once this worker controls it (`controllerchange`).
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	const decision = decide(
		{
			method: event.request.method,
			url: event.request.url,
			origin: safeOrigin(event.request.url),
			mode: event.request.mode,
			destination: event.request.destination
		},
		self.location.origin
	);

	switch (decision) {
		case 'navigation':
			event.respondWith(respondNavigation(event));
			break;
		case 'cache-first':
			event.respondWith(respondCacheFirst(event.request));
			break;
		case 'bypass':
			// Credentials, CORS and non-GET requests keep the browser's
			// default handling.
			break;
	}
});

/** An unparsable URL can only be bypassed, so it must never throw here. */
function safeOrigin(url: string): string {
	try {
		return new URL(url).origin;
	} catch {
		return '';
	}
}

/**
 * Cache-first navigation: every route serves the cached 200.html shell. A
 * background fetch refreshes the shell when online, but the child never waits
 * on the network for a route change.
 */
async function respondNavigation(event: FetchEvent): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(INDEX);
	// A navigation Request has mode "navigate", which fetch() rejects, so the
	// refresh goes by URL instead.
	const refresh = fetch(event.request.url, { headers: event.request.headers })
		.then(async (response) => {
			if (!response.ok) return undefined;
			const clean = await cleanResponse(response);
			await cache.put(INDEX, clean.clone()).catch(() => {});
			return clean;
		})
		.catch(() => undefined);

	if (cached) {
		event.waitUntil(refresh.then(() => undefined));
		return cached;
	}
	return (await refresh) ?? Response.error();
}

/** Cache-first; a miss goes to the network and is then stored for next time. */
async function respondCacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	if (response.ok && response.type === 'basic') {
		await cache.put(request, response.clone()).catch(() => {});
	}
	return response;
}
