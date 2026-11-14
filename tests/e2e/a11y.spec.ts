import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('Escape closes the word panel and returns focus to the bucket', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	const bucket = page.getByRole('button', { name: /open word 1/i });
	await bucket.click();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(bucket).toBeFocused();
});

test('a placed letter is announced politely', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.getByRole('button', { name: /open word 1/i }).click();

	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	const letter = await slot.getAttribute('data-letter');
	await page.locator(`[data-tile][data-letter="${letter}"]`).first().click();
	await slot.click();

	await expect(page.locator('.sr-only[aria-live="polite"]')).toHaveText('Word complete!');
});

test('keyboard selects a tile and places it in a slot', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();

	const tile = page.locator('[data-tile]').first();
	await tile.focus();
	await page.keyboard.press('Enter');
	await expect(tile).toHaveAttribute('data-state', 'selected');

	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	await slot.focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
});

test('focus wraps inside the word panel', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();

	const close = page.getByRole('button', { name: 'Close', exact: true });
	const lastTile = page.locator('[data-tile]').last();
	await close.focus();
	await page.keyboard.press('Shift+Tab');
	await expect(lastTile).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(close).toBeFocused();
});

test('reduced motion removes long transitions', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();

	const duration = await page
		.locator('.tray .tile')
		.first()
		.evaluate((element) => getComputedStyle(element).transitionDuration);
	expect(Number.parseFloat(duration)).toBeLessThan(0.02);
});

test('a solved word bursts confetti unless reduced motion is on', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();

	for (let guard = 0; guard < 5; guard++) {
		const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
		if ((await slot.count()) === 0) break;
		const letter = await slot.getAttribute('data-letter');
		await page.locator(`[data-tile][data-letter="${letter}"]`).first().click();
		await slot.click();
	}
	await expect(page.locator('.done-title')).toBeVisible();
	await expect(page.locator('.word-row.complete')).toBeVisible();
	const letterAnimation = await page
		.locator('.word-row.complete > *')
		.first()
		.evaluate((element) => getComputedStyle(element).animationName);
	expect(letterAnimation).toContain('letter-settle');

	const burst = page.locator('.confetti span').first();
	const animation = await burst.evaluate((element) => getComputedStyle(element).animationName);
	expect(animation).toContain('confetti');

	await page.emulateMedia({ reducedMotion: 'reduce' });
	const confetti = page.locator('.confetti');
	expect(await confetti.evaluate((element) => getComputedStyle(element).display)).toBe('none');
});
