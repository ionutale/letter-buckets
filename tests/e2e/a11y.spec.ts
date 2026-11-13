import { expect, test } from '@playwright/test';

test('Escape closes the word panel and returns focus to the bucket', async ({ page }) => {
	await page.goto('/en/levels/1');
	const bucket = page.getByRole('button', { name: /open word 1/i });
	await bucket.click();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(bucket).toBeFocused();
});

test('a placed letter is announced politely', async ({ page }) => {
	await page.goto('/en/levels/1');
	await page.getByRole('button', { name: /open word 1/i }).click();

	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	const letter = await slot.getAttribute('data-letter');
	await page.locator(`[data-tile][data-letter="${letter}"]`).first().click();
	await slot.click();

	await expect(page.locator('.sr-only[aria-live="polite"]')).toHaveText('Word complete!');
});
