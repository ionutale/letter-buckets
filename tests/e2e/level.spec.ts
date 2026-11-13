import { expect, test } from '@playwright/test';

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
	await expect(page).toHaveURL(/\/en\/levels$/);
});
