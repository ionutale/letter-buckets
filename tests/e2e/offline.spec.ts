import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('works offline after install, including word audio and art', async ({ page, context }) => {
	await page.goto('/en/');
	await page.evaluate(() => navigator.serviceWorker.ready);

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: /gentle word games/i })).toBeVisible();

	const audio = await page.evaluate(async () => (await fetch('/audio/words/en/l01-w1.mp3')).status);
	const image = await page.evaluate(async () => (await fetch('/art/levels/l01.webp')).status);
	expect(audio).toBe(200);
	expect(image).toBe(200);
});
