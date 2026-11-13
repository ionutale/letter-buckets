import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('a 320px phone fits a six-letter word without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await seedSave(page, { clearedThrough: 4 });
	await page.goto('/en/levels/5');
	await expect(page.locator('button.bucket')).toHaveCount(3);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
		.toBe(false);

	await page.locator('button.bucket').nth(2).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('.word-row > *')).toHaveCount(6);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
		.toBe(false);
});
