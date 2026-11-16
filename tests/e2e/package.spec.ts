import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('package 2 is locked until package 1 is complete', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/');
	await expect(page.getByRole('button', { name: 'Package 2' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Package 3' })).toBeDisabled();
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

test('package 3 unlocks after package 2 and opens Feelings', async ({ page }) => {
	await seedSave(page, { locale: 'en', clearedThrough: 50 });
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save-p2',
			JSON.stringify({
				version: 1,
				settings: {},
				locales: {
					en: {
						clearedThrough: 50,
						levelWords: {},
						unlocked: {},
						chapterStamps: [1, 2, 3, 4, 5]
					}
				}
			})
		);
	});
	await page.goto('/en/');
	const package3 = page.getByRole('button', { name: 'Package 3' });
	await expect(package3).toBeEnabled();
	await package3.click();
	await expect(page.locator('.play-sub')).toHaveText('Level 1 · Feelings');
	await page.locator('a.play').click();
	await expect(page.getByRole('heading', { name: 'Feelings' })).toBeVisible();
});
