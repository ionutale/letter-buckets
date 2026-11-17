/// <reference types="@sveltejs/kit" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { resolve } from '$app/paths';
import { self } from '$app/service-worker';
import { decide, isLazyVoiceClip } from '#lib/pwa/policy';

// One cache per deployment: a new build opens a fresh cache and the activate
// handler deletes everything else, so stale assets can never be served.
const CACHE = `letter-buckets-${version}`;
const INDEX = '/200.html';
const BATCH = 8;

// `immutable`/`assets` are relative to the base path; resolve them to
// pathnames that can be cached and matched back. `assets` includes every file
// in static/, so all 50 illustrations and the default word clips are covered.
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
].filter((path) => !isLazyVoiceClip(path));

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			const urls = [...PRECACHE, INDEX];
			for (let i = 0; i < urls.length; i += BATCH) {
				await Promise.all(urls.slice(i, i + BATCH).map((url) => cache.add(url).catch(() => {})));
			}
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
	const refresh = fetch(event.request)
		.then(async (response) => {
			if (response.ok) await cache.put(INDEX, response.clone()).catch(() => {});
			return response;
		})
		.catch(() => undefined);

	if (cached) {
		event.waitUntil(refresh.then(() => undefined));
		return cached;
	}
	const response = await refresh;
	return response ?? Response.error();
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
