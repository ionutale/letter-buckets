import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('two identical letters in a word keep separate tile identities', async ({ page }) => {
	await seedSave(page, { clearedThrough: 25 });
	await page.goto('/en/levels/26');
	await page.locator('button.bucket').first().click();

	const oSlots = page.locator('[data-slot][data-letter="O"]');
	const oTiles = page.locator('[data-tile][data-letter="O"]');
	await expect(oSlots).toHaveCount(2);
	await expect(oTiles).toHaveCount(2);

	await oTiles.first().click();
	await oSlots.first().click();

	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
	await expect(page.locator('[data-tile][data-letter="O"]')).toHaveCount(1);

	await page.locator('[data-tile][data-letter="O"]').first().click();
	await page.locator('[data-slot]:not([data-filled="true"])[data-letter="O"]').first().click();
	await expect(page.locator('.done-title')).toBeVisible();
});
