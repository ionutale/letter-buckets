import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('package 2 is locked until package 1 is complete', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/');
	await expect(page.getByRole('button', { name: 'Package 2' })).toBeDisabled();
	await expect(page.locator('.play-sub')).toHaveText('Level 1 · Pets');
});

test('switching to package 2 opens its own level one', async ({ page }) => {
	await seedSave(page, { locale: 'en', clearedThrough: 50 });
	await page.goto('/en/');
	const package2 = page.getByRole('button', { name: 'Package 2' });
	await expect(package2).toBeEnabled();
	await package2.click();

	await expect(package2).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.play-sub')).toHaveText('Level 1 · Kitchen tools');
	await page.locator('a.play').click();
	await expect(page.getByRole('heading', { name: 'Kitchen tools' })).toBeVisible();

	await page.locator('button.bucket').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.goto('/en/');
	await page.getByRole('button', { name: 'Package 1' }).click();
	await expect(page.locator('.play-sub')).toHaveText('Level 50 · Celebration');
});
