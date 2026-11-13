import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('opens a bucket into a word panel', async ({ page }) => {
	await page.goto('/en/levels/1');
	await expect(page.getByRole('button', { name: /open word/i })).toHaveCount(3);
	await page.getByRole('button', { name: /open word 1/i }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: /close/i }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('a locked level redirects to the level map', async ({ page }) => {
	await page.goto('/en/levels/50');
	await expect(page).toHaveURL(/\/en\/levels\?locked=1$/);
});

test('each bucket shows its word clue image, and the panel keeps it', async ({ page }) => {
	await seedSave(page, { locale: 'ro' });
	await page.goto('/ro/levels/1');
	const clues = page.locator('button.bucket img.clue');
	await expect(clues).toHaveCount(3);
	await expect(clues.first()).toHaveAttribute('src', '/art/words/ro/l01-w1.webp');

	await page.locator('button.bucket').first().click();
	await expect(page.locator('img[data-clue]')).toHaveAttribute('src', '/art/words/ro/l01-w1.webp');
});

test('fits an eight-letter word without overflow at 320px', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await seedSave(page, { locale: 'en', clearedThrough: 49 });
	await page.goto('/en/levels/20');
	await page.locator('button.bucket').first().click();

	const row = page.locator('.word-row');
	await expect(row.locator(':scope > *')).toHaveCount(8);
	const overflow = await row.evaluate((element) => element.scrollWidth - element.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
	const box = await row.boundingBox();
	expect(box).not.toBeNull();
	expect(box!.x).toBeGreaterThanOrEqual(0);
	expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
