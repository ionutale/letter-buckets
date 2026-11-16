import { expect, test } from '@playwright/test';

test('home Play continues at the current level', async ({ page }) => {
	await page.goto('/en/');
	await page.getByRole('link', { name: /^Play/ }).click();
	await expect(page).toHaveURL(/\/en\/levels\/1$/);
});

test('the map shows ten levels and explains a locked one', async ({ page }) => {
	await page.goto('/en/levels');
	await expect(page.locator('button.level')).toHaveCount(10);
	await expect(page.locator('button.level[data-state="current"]')).toHaveCount(1);

	await page.getByRole('button', { name: /level 2, locked/i }).click();
	await expect(page.getByRole('status')).toHaveText(/finish level 1 first/i);

	await page.getByRole('button', { name: /farm & animals/i }).click();
	await expect(page.getByRole('button', { name: /level 11, locked/i })).toBeVisible();
	await expect(page.locator('button.level')).toHaveCount(10);
});

test('a completed level unlocks the next one', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: true },
				locales: {
					en: {
						clearedThrough: 1,
						levelWords: { 1: [0, 1, 2] },
						unlocked: { '1:0': true, '1:1': true, '1:2': true },
						chapterStamps: [1]
					}
				}
			})
		);
	});

	await page.goto('/en/');
	await expect(page.getByRole('link', { name: /^Play/ })).toHaveAttribute('href', '/en/levels/2');

	await page.goto('/en/levels');
	await expect(page.locator('button.level[data-state="done"]')).toHaveCount(1);
	await expect(page.locator('button.level[data-state="current"]')).toHaveCount(1);
	await expect(page.locator('button.level[data-state="current"]')).toContainText('2');
});
