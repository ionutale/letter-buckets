import { expect, test, type Page } from '@playwright/test';
import { seedSave } from './helpers.js';

/** Solve the level using only focus and Enter, like a keyboard-only player. */
async function solveWithKeyboard(page: Page): Promise<void> {
	for (let index = 0; index < 3; index++) {
		const bucket = page.getByRole('button', { name: new RegExp(`open word ${index + 1}`, 'i') });
		await bucket.focus();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog')).toBeVisible();
		for (let guard = 0; guard < 5; guard++) {
			const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
			if ((await slot.count()) === 0) break;
			const letter = await slot.getAttribute('data-letter');
			const tile = page.locator(`[data-tile][data-letter="${letter}"]`).first();
			await tile.focus();
			await page.keyboard.press('Enter');
			await slot.focus();
			await page.keyboard.press('Enter');
		}
		await expect(page.locator('.done-title')).toBeVisible();
		await expect(page.locator('.done-card button.back')).toBeFocused();
		await page.keyboard.press('Enter');
	}
}

async function focusInDialog(page: Page): Promise<boolean> {
	return page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null);
}

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

test('keyboard focus enters the word panel, is trapped there and returns to the bucket', async ({
	page
}) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	const bucket = page.getByRole('button', { name: /open word 1/i });
	await bucket.focus();
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	expect(await focusInDialog(page)).toBe(true);

	for (let step = 0; step < 12; step++) {
		await page.keyboard.press('Tab');
		expect(await focusInDialog(page)).toBe(true);
	}

	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(bucket).toBeFocused();
});

test('keyboard focus enters the level-complete dialog and stays trapped', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await solveWithKeyboard(page);

	const dialog = page.getByRole('dialog', { name: /level complete/i });
	await expect(dialog).toBeVisible();
	expect(await focusInDialog(page)).toBe(true);

	for (let step = 0; step < 8; step++) {
		await page.keyboard.press('Tab');
		expect(await focusInDialog(page)).toBe(true);
	}

	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(page).toHaveURL(/\/en\/levels$/);
});

test('a repeated wrong placement is announced every time', async ({ page }) => {
	await seedSave(page, { clearedThrough: 4 });
	await page.goto('/en/levels/5');
	await page.locator('button.bucket').first().click();
	const region = page.locator('.sr-only[aria-live="polite"]');
	await page.evaluate(() => {
		const target = document.querySelector('.sr-only[aria-live="polite"]')!;
		(window as unknown as { __spoken: string[] }).__spoken = [];
		new MutationObserver(() => {
			const text = target.textContent ?? '';
			if (text) (window as unknown as { __spoken: string[] }).__spoken.push(text);
		}).observe(target, { childList: true, subtree: true, characterData: true });
	});

	for (let attempt = 0; attempt < 2; attempt++) {
		const pair = await page.evaluate(() => {
			const slots = [...document.querySelectorAll('[data-slot]:not([data-filled="true"])')];
			const tiles = [...document.querySelectorAll('[data-tile]')];
			for (const slot of slots) {
				const expected = slot.getAttribute('data-letter');
				const tile = tiles.find((entry) => entry.getAttribute('data-letter') !== expected);
				if (tile) {
					return { slot: slot.getAttribute('data-slot'), tile: tile.getAttribute('data-tile') };
				}
			}
			return null;
		});
		expect(pair).not.toBeNull();
		await page.locator(`[data-tile="${pair!.tile}"]`).click();
		await page.locator(`[data-slot="${pair!.slot}"]`).click();
	}
	await expect(region).toHaveText('Try another letter');
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
		.toBeGreaterThanOrEqual(2);
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

test('reset progress uses the same three-second confirm by keyboard', async ({ page }) => {
	await seedSave(page, { clearedThrough: 3 });
	await page.goto('/en/settings');
	const reset = page.locator('button.reset');
	await reset.scrollIntoViewIfNeeded();
	await expect(reset).toBeVisible();

	// The status region is already mounted and empty before any text arrives.
	const status = page.locator('p.sr-only[role="status"]');
	await expect(status).toBeEmpty();
	await expect(reset.getByRole('progressbar')).toHaveCount(1);

	await reset.focus();
	await page.keyboard.down('Space');
	await expect
		.poll(async () => Number(await reset.getByRole('progressbar').getAttribute('aria-valuenow')))
		.toBeGreaterThan(0);
	await expect(page.locator('.toast')).toHaveText('Progress reset.', { timeout: 6000 });
	await page.keyboard.up('Space');
	await expect(status).toHaveText('Progress reset.');
});

test('the keyboard focus ring reaches 3:1 contrast on every route', async ({ page }) => {
	await seedSave(page);
	for (const route of ['/en/', '/en/levels/1', '/en/settings']) {
		await page.goto(route);
		await expect(page.locator('main')).toBeVisible();
		await page.keyboard.press('Tab');
		const outline = await page.evaluate(() => {
			const active = document.activeElement!;
			const style = getComputedStyle(active);
			return {
				tag: active.tagName,
				focused: active.matches(':focus-visible'),
				color: style.outlineColor,
				width: style.outlineWidth,
				style: style.outlineStyle
			};
		});
		expect(outline.tag).not.toBe('BODY');
		expect(outline.focused).toBe(true);
		// --lb-ochre-dark (#c4661a) → 3.71:1 on paper, 3.41:1 on paper-2.
		expect(outline.color).toBe('rgb(196, 102, 26)');
		expect(outline.width).toBe('3px');
		expect(outline.style).toBe('solid');
	}
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
