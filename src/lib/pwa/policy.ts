export interface DecisionInput {
	method: string;
	url: string;
	origin: string;
	mode: string;
	destination: string;
}

export type Decision = 'navigation' | 'cache-first' | 'bypass';

const CACHE_FIRST_DESTINATIONS = new Set(['audio', 'image', 'font', 'script', 'style', 'manifest']);
const CACHE_FIRST_PREFIXES = ['/audio/', '/art/', '/icons/'];

/**
 * Route one fetch to the service worker's three lanes:
 * - `navigation`: the cached 200.html shell, refreshed in the background;
 * - `cache-first`: same-origin GETs for the app's static assets and audio;
 * - `bypass`: everything else (cross-origin, non-GET, unknown destinations).
 */
export function decide(input: DecisionInput, origin: string): Decision {
	if (input.method !== 'GET' || input.origin !== origin) return 'bypass';
	if (input.mode === 'navigate') return 'navigation';
	if (CACHE_FIRST_DESTINATIONS.has(input.destination)) return 'cache-first';
	try {
		const path = new URL(input.url).pathname;
		if (CACHE_FIRST_PREFIXES.some((prefix) => path.startsWith(prefix))) return 'cache-first';
	} catch {
		return 'bypass';
	}
	return 'bypass';
}

/**
 * Art and word audio are not precached: the app downloads them progressively
 * (level by level, then package by package) and the cache-first lane stores
 * whatever passes through. UI sounds and the music loop stay in the install.
 */
export function isDownloadedAsset(path: string): boolean {
	// SvelteKit's asset manifest lists `art/levels/l01.webp`, without the
	// leading slash that arrives on a request.
	const full = path.startsWith('/') ? path : `/${path}`;
	// Manifests are fetched by the downloader on demand, not part of the install.
	if (full.startsWith('/manifests/')) return true;
	if (full.startsWith('/audio/sfx/') || full.startsWith('/audio/music/')) return false;
	return full.startsWith('/art/') || full.startsWith('/audio/');
}
