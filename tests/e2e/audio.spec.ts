import { expect, test } from '@playwright/test';

test('mute persists across reloads', async ({ page }) => {
	await page.goto('/en/settings');
	const toggle = page.locator('button.toggle');
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');

	await page.reload();
	await expect(page.locator('button.toggle')).toHaveAttribute('aria-pressed', 'false');
	const muted = await page.evaluate(() => {
		const raw = localStorage.getItem('letter-buckets-save');
		return raw ? JSON.parse(raw).settings.muted : null;
	});
	expect(muted).toBe(true);
});

test('coach marks appear on level 1 and stay dismissed', async ({ page }) => {
	await page.goto('/en/levels/1');
	await expect(page.getByText('Tap a bucket', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: /open word 1/i }).click();
	await expect(
		page.getByText('Drag the letter to the gap, or tap it, then tap the gap.', { exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Got it', exact: true }).click();
	await expect(page.getByText('Tap a bucket', { exact: true })).toHaveCount(0);
	await page.reload();
	await expect(page.getByText('Tap a bucket', { exact: true })).toHaveCount(0);
});

test('the install hint appears after a cleared level and stays dismissed', async ({ page }) => {
	await page.addInitScript(() => {
		if (localStorage.getItem('letter-buckets-save')) return;
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: false },
				locales: {
					en: {
						clearedThrough: 1,
						levelWords: {},
						unlocked: {},
						chapterStamps: [1]
					}
				}
			})
		);
	});

	await page.goto('/en/');
	await expect(
		page.getByText('Add Letter Buckets to your home screen to play offline.', { exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Not now', exact: true }).click();
	await page.reload();
	await expect(
		page.getByText('Add Letter Buckets to your home screen to play offline.', { exact: true })
	).toHaveCount(0);
});

test('the level header sound toggle persists', async ({ page }) => {
	await page.goto('/en/levels/1');
	const mute = page.getByRole('button', { name: 'Sound', exact: true });
	await expect(mute).toHaveAttribute('aria-pressed', 'true');
	await mute.click();
	await expect(mute).toHaveAttribute('aria-pressed', 'false');
	const muted = await page.evaluate(() => {
		const raw = localStorage.getItem('letter-buckets-save');
		return raw ? JSON.parse(raw).settings.muted : null;
	});
	expect(muted).toBe(true);
});
