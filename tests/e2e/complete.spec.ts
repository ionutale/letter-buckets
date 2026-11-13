import { expect, test } from '@playwright/test';

test('completing all three words opens the level celebration and unlocks the next level', async ({
	page
}) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: true },
				locales: {
					en: {
						clearedThrough: 0,
						levelWords: {},
						unlocked: {},
						chapterStamps: []
					}
				}
			})
		);
	});

	await page.goto('/en/levels/1');

	for (let index = 0; index < 3; index++) {
		await page.getByRole('button', { name: new RegExp(`open word ${index + 1}`, 'i') }).click();
		const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
		const letter = await slot.getAttribute('data-letter');
		await page.locator(`[data-tile][data-letter="${letter}"]`).first().click();
		await slot.click();
		await expect(page.locator('.done-title')).toBeVisible();
		await page.getByRole('button', { name: /back to buckets/i }).click();
	}

	await expect(page.getByRole('dialog', { name: /level complete/i })).toBeVisible();
	await expect(page.getByText('Level complete!', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: /next level/i }).click();
	await expect(page).toHaveURL(/\/en\/levels\/2$/);
});
