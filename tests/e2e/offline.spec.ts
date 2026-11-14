import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('works offline after install, including real word playback and art', async ({
	page,
	context
}) => {
	test.setTimeout(180_000);
	await page.addInitScript(() => {
		const original = HTMLMediaElement.prototype.play;
		HTMLMediaElement.prototype.play = function () {
			const played = ((window as unknown as { __played?: string[] }).__played ??= []);
			played.push(this.src);
			return original.call(this).catch(() => {});
		};
	});

	await page.goto('/en/');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const keys = await page.evaluate(() => caches.keys());
	expect(keys.some((key) => key.startsWith('letter-buckets-'))).toBe(true);

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: /gentle word games/i })).toBeVisible();

	const audio = await page.evaluate(async () => (await fetch('/audio/words/en/l01-w1.mp3')).status);
	const image = await page.evaluate(async () => (await fetch('/art/levels/l01.webp')).status);
	const clue = await page.evaluate(async () => (await fetch('/art/words/ro/l01-w1.webp')).status);
	expect(audio).toBe(200);
	expect(image).toBe(200);
	expect(clue).toBe(200);

	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect
		.poll(async () =>
			page.evaluate(() =>
				((window as unknown as { __played?: string[] }).__played ?? []).some((src) =>
					src.includes('/audio/words/en/l01-w1.mp3')
				)
			)
		)
		.toBe(true);
});
