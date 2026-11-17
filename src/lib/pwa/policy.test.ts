import { describe, expect, it } from 'vitest';
import { decide, isDownloadedAsset } from './policy.js';

const app = 'https://letterbuckets.test';
const input = (over: Partial<Parameters<typeof decide>[0]>) => ({
	method: 'GET',
	url: `${app}/levels`,
	origin: app,
	mode: 'navigate',
	destination: 'document',
	...over
});

describe('decide', () => {
	it('serves navigations from the cached shell', () => {
		expect(decide(input({}), app)).toBe('navigation');
	});
	it('serves same-origin audio cache-first', () => {
		expect(
			decide(
				input({
					mode: 'no-cors',
					destination: 'audio',
					url: `${app}/audio/words/en/l01-w1.mp3`
				}),
				app
			)
		).toBe('cache-first');
	});
	it('serves same-origin images, fonts, scripts and styles cache-first', () => {
		for (const destination of ['image', 'font', 'script', 'style']) {
			expect(decide(input({ mode: 'no-cors', destination, url: `${app}/x` }), app)).toBe(
				'cache-first'
			);
		}
	});
	it('serves an audio URL fetched from script cache-first', () => {
		expect(
			decide(
				input({
					mode: 'cors',
					destination: 'empty',
					url: `${app}/audio/words/en/l01-w1.mp3`
				}),
				app
			)
		).toBe('cache-first');
	});

	it('leaves art and word audio to the progressive downloader', () => {
		expect(isDownloadedAsset('/art/levels/l01.webp')).toBe(true);
		expect(isDownloadedAsset('/art/p2/words/en/l01-w1.webp')).toBe(true);
		expect(isDownloadedAsset('/audio/words/en/l01-w1.mp3')).toBe(true);
		expect(isDownloadedAsset('/audio/p2/words/it/marco/l01-w1.mp3')).toBe(true);
		expect(isDownloadedAsset('/audio/sfx/coin.mp3')).toBe(false);
		expect(isDownloadedAsset('/audio/music/loop.mp3')).toBe(false);
		expect(isDownloadedAsset('/icons/apple-touch-icon.png')).toBe(false);
		// The asset manifest drops the leading slash.
		expect(isDownloadedAsset('art/levels/l01.webp')).toBe(true);
		expect(isDownloadedAsset('audio/words/en/l01-w1.mp3')).toBe(true);
		expect(isDownloadedAsset('audio/sfx/coin.mp3')).toBe(false);
	});

	it('bypasses non-GET and cross-origin requests', () => {
		expect(decide(input({ method: 'POST' }), app)).toBe('bypass');
		expect(decide(input({ origin: 'https://other.test' }), app)).toBe('bypass');
	});
});
