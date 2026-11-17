import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

/** Records the src of every element the app actually plays. */
async function spyOnPlayback(page: import('@playwright/test').Page): Promise<void> {
	await page.addInitScript(() => {
		const played: string[] = [];
		(window as unknown as { __played: string[] }).__played = played;
		HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
			played.push(this.src);
			return Promise.resolve();
		};
	});
}

const lastPlayed = (page: import('@playwright/test').Page) =>
	page.evaluate(() => (window as unknown as { __played: string[] }).__played.slice(-1)[0] ?? '');

test('italian settings offers five narrators and previews the chosen one', async ({ page }) => {
	await spyOnPlayback(page);
	await seedSave(page, { locale: 'it', muted: false });

	await page.goto('/it/settings');
	await expect(page.locator('.voice')).toHaveCount(5);
	await expect(page.getByRole('button', { name: 'Narratrice', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.getByRole('button', { name: /Marco/ }).click();

	await expect(page.getByRole('button', { name: /Marco/ })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Narratrice', exact: true })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	expect(await lastPlayed(page)).toContain('/audio/words/it/marco/l01-w1.mp3');

	const stored = await page.evaluate(
		() => JSON.parse(localStorage.getItem('letter-buckets-save') ?? '{}').settings?.voice
	);
	expect(stored).toBe('marco');
});

test('the chosen narrator survives a reload and plays in the game', async ({ page }) => {
	await spyOnPlayback(page);
	await seedSave(page, { locale: 'it', muted: false });

	await page.goto('/it/settings');
	await page.getByRole('button', { name: /Nonna Lucia/ }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: /Nonna Lucia/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.goto('/it/levels/1');
	await page.locator('button.bucket').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	expect(await lastPlayed(page)).toContain('/audio/words/it/lucia/l01-w1.mp3');
});

test('other languages do not show the narrator picker', async ({ page }) => {
	await seedSave(page, { locale: 'en' });
	await page.goto('/en/settings');
	await expect(page.locator('.voice-list')).toHaveCount(0);
});
