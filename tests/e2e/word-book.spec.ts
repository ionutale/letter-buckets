import { expect, test } from '@playwright/test';

test('shows unlocked words and hides the rest', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: true },
				locales: {
					en: {
						clearedThrough: 0,
						levelWords: { 1: [0, 1] },
						unlocked: { '1:0': true, '1:1': true },
						chapterStamps: []
					}
				}
			})
		);
	});

	await page.goto('/en/words');
	await expect(page.getByText('2 of 150 words')).toBeVisible();
	await expect(page.locator('.chip')).toHaveCount(150);
	await expect(page.locator('.chip.unlocked')).toHaveCount(2);

	const cat = page.getByRole('button', { name: 'Hear CAT', exact: true });
	await expect(cat).toHaveAttribute('data-audio', '/audio/words/en/l01-w1.mp3');
	await expect(page.getByRole('button', { name: 'Hear DOG', exact: true })).toBeVisible();
	await expect(page.locator('.chip.locked').first()).toBeVisible();
});
