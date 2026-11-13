import type { Reroute } from '@sveltejs/kit/hooks';
import { deLocalizeUrl } from '#lib/paraglide/runtime.js';

/** Strip the Paraglide locale prefix before SvelteKit matches a route. */
export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
