import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('a corrupt save starts a fresh level-1 session', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('letter-buckets-save', 'not json');
	});
	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/1');
});

test('a missing illustration does not take the level down', async ({ page }) => {
	await page.route('**/art/levels/l01.webp', (route) => route.abort());
	await seedSave(page);
	await page.goto('/en/levels/1');
	await expect(page.locator('button.bucket')).toHaveCount(3);
	await expect(page.locator('img.banner')).toHaveCount(0);
});
