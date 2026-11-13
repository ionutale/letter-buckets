import { expect, test } from '@playwright/test';
import { seedSave, solveLevel } from './helpers.js';

test('word and level progress survives a reload; replay keeps the Word Book', async ({ page }) => {
	await seedSave(page, { clearedThrough: 0 });
	await page.goto('/en/levels/1');
	await solveLevel(page);
	await expect(page.getByRole('dialog', { name: /level complete/i })).toBeVisible();

	await page.reload();
	await expect(page.locator('button.bucket[data-state="done"]')).toHaveCount(3);
	await expect(page.locator('button.again')).toBeVisible();

	const save = await page.evaluate(() => JSON.parse(localStorage.getItem('letter-buckets-save')!));
	expect(save.locales.en.levelWords['1']).toEqual([0, 1, 2]);
	expect(Object.keys(save.locales.en.unlocked).sort()).toEqual(['1:0', '1:1', '1:2']);
	expect(save.locales.en.chapterStamps).toEqual([]);

	await page.goto('/en/');
	await expect(page.getByText('3 of 150 words', { exact: true })).toBeVisible();

	await page.goto('/en/levels/1');
	await page.locator('button.again').click();
	await expect(page.locator('button.bucket[data-state="closed"]')).toHaveCount(3);
	const replayed = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('letter-buckets-save')!)
	);
	expect(replayed.locales.en.levelWords['1']).toEqual([]);
	expect(Object.keys(replayed.locales.en.unlocked)).toHaveLength(3);
});

test('a chapter stamp is awarded only at level 10, not mid-chapter', async ({ page }) => {
	await seedSave(page, { clearedThrough: 9 });
	await page.goto('/en/levels/10');
	await solveLevel(page);
	await page.reload();

	await page.goto('/en/');
	await expect(page.locator('.stamps .filled')).toHaveCount(1);
	const save = await page.evaluate(() => JSON.parse(localStorage.getItem('letter-buckets-save')!));
	expect(save.locales.en.chapterStamps).toEqual([1]);
});

test('level 50 ends with the final celebration and the Word Book', async ({ page }) => {
	await seedSave(page, { clearedThrough: 49 });
	await page.goto('/en/levels/50');
	await solveLevel(page);

	await expect(page.getByText('You did it!', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Word Book', exact: true }).click();
	await expect(page).toHaveURL(/\/en\/words$/);
});
