import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedSave } from './helpers.js';

/** Records every progress label the bar shows, even for a moment. */
async function watchBar(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const labels: string[] = [];
		(window as unknown as { __labels: string[] }).__labels = labels;
		const timer = window.setInterval(() => {
			const label = document.querySelector('.download-bar .label')?.textContent?.trim();
			if (label && labels[labels.length - 1] !== label) labels.push(label);
			if (!document.querySelector('.download-bar') && labels.length > 0)
				window.clearInterval(timer);
		}, 40);
	});
}

const barLabels = (page: Page) =>
	page.evaluate(() => (window as unknown as { __labels: string[] }).__labels ?? []);

const cachedPaths = (page: Page) =>
	page.evaluate(async () => {
		const keys = await caches.keys();
		const name = keys.find((key) => key.startsWith('letter-buckets-'));
		if (!name) return [];
		const cache = await caches.open(name);
		return (await cache.keys()).map((request) => new URL(request.url).pathname);
	});

test.describe.configure({ mode: 'serial' });

test('a first visit downloads package one in level order behind a progress bar', async ({
	page
}) => {
	await watchBar(page);
	await page.goto('/en/');
	await expect
		.poll(() => barLabels(page).then((labels) => labels.length), { timeout: 20_000 })
		.toBeGreaterThan(0);
	await expect(page.locator('.download-bar')).toHaveCount(0, { timeout: 90_000 });

	const paths = await cachedPaths(page);
	expect(paths).toContain('/art/levels/l01.webp');
	expect(paths).toContain('/audio/words/en/l01-w1.mp3');
	expect(paths.filter((path) => path.startsWith('/art/levels/'))).toHaveLength(50);
	expect(paths.filter((path) => path.startsWith('/audio/words/en/'))).toHaveLength(150);
	expect(paths.filter((path) => path.startsWith('/audio/p2/'))).toHaveLength(0);

	expect((await barLabels(page)).some((label) => label.startsWith('Preparing the game'))).toBe(
		true
	);
});

test('an unlocked package downloads in the background and names itself', async ({ page }) => {
	await watchBar(page);
	await seedSave(page, { locale: 'it', clearedThrough: 50 });
	await page.goto('/it/');
	await expect
		.poll(() => barLabels(page).then((labels) => labels.length), { timeout: 20_000 })
		.toBeGreaterThan(0);
	await expect(page.locator('.download-bar')).toHaveCount(0, { timeout: 120_000 });

	const paths = await cachedPaths(page);
	expect(paths.filter((path) => path.startsWith('/audio/p2/words/it/'))).toHaveLength(150);

	const labels = await barLabels(page);
	expect(labels.some((label) => label.includes('pacchetto 2'))).toBe(true);
});

test('a locked package is not downloaded', async ({ page }) => {
	await watchBar(page);
	await seedSave(page, { locale: 'it', clearedThrough: 10 });
	await page.goto('/it/');
	await expect
		.poll(() => barLabels(page).then((labels) => labels.length), { timeout: 20_000 })
		.toBeGreaterThan(0);
	await expect(page.locator('.download-bar')).toHaveCount(0, { timeout: 90_000 });

	const paths = await cachedPaths(page);
	expect(paths.filter((path) => path.startsWith('/audio/p2/'))).toHaveLength(0);
	expect(paths.filter((path) => path.startsWith('/audio/p3/'))).toHaveLength(0);
});
