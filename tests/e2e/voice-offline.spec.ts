import { expect, test } from '@playwright/test';

// The default narrator is precached; the alternates are cached the first time
// one is played, so install stays small and offline keeps working afterwards.
test('alternate narrators are cached on first play, not at install', async ({ page, context }) => {
	test.setTimeout(180_000);

	await page.goto('/it/');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const cached = (path: string) =>
		page.evaluate(async (url) => (await caches.match(url)) !== undefined, path);

	expect(await cached('/audio/words/it/l01-w1.mp3')).toBe(true);
	expect(await cached('/audio/words/it/chiara/l01-w1.mp3')).toBe(false);

	// One online play is enough for the cache-first lane to keep it.
	const online = await page.evaluate(async () => {
		const response = await fetch('/audio/words/it/chiara/l01-w1.mp3');
		return response.status;
	});
	expect(online).toBe(200);
	await expect.poll(() => cached('/audio/words/it/chiara/l01-w1.mp3')).toBe(true);

	await context.setOffline(true);
	const offline = await page.evaluate(async () => {
		const response = await fetch('/audio/words/it/chiara/l01-w1.mp3');
		return response.status;
	});
	expect(offline).toBe(200);
});
