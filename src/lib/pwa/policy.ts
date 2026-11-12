export interface DecisionInput {
	method: string;
	url: string;
	origin: string;
	mode: string;
	destination: string;
}

export type Decision = 'navigation' | 'cache-first' | 'bypass';

const CACHE_FIRST_DESTINATIONS = new Set([
	'audio',
	'image',
	'font',
	'script',
	'style',
	'manifest'
]);

/**
 * Route one fetch to the service worker's three lanes:
 * - `navigation`: the cached 200.html shell, refreshed in the background;
 * - `cache-first`: same-origin GETs for the app's static assets and audio;
 * - `bypass`: everything else (cross-origin, non-GET, unknown destinations).
 */
export function decide(input: DecisionInput, origin: string): Decision {
	if (input.method !== 'GET' || input.origin !== origin) return 'bypass';
	if (input.mode === 'navigate') return 'navigation';
	return CACHE_FIRST_DESTINATIONS.has(input.destination) ? 'cache-first' : 'bypass';
}
