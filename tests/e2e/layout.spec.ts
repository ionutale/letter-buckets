import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('a 320px phone fits a six-letter word without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await seedSave(page, { clearedThrough: 4 });
	await page.goto('/en/levels/5');
	await expect(page.locator('button.bucket')).toHaveCount(3);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
		.toBe(false);

	await page.locator('button.bucket').nth(2).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('.word-row > *')).toHaveCount(6);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))
		.toBe(false);
});

test('dragging on the page never starts a text selection', async ({ page }) => {
	await seedSave(page, { locale: 'en' });
	await page.goto('/en/settings');
	await expect(page.locator('#volume-music')).toBeVisible();

	const styles = await page.evaluate(() => {
		const range = document.querySelector('#volume-music');
		return {
			body: getComputedStyle(document.body).userSelect,
			range: range ? getComputedStyle(range).userSelect : null
		};
	});
	expect(styles.body).toBe('none');
	expect(styles.range).toBe('text');

	// A drag across the about text must not leave a selection behind.
	await page.mouse.move(20, 300);
	await page.mouse.down();
	await page.mouse.move(300, 360, { steps: 10 });
	await page.mouse.up();
	expect(await page.evaluate(() => (window.getSelection()?.toString() ?? '').length)).toBe(0);
});

test('the game cannot be pinched or double-tap zoomed', async ({ page }) => {
	await page.goto('/en/settings');

	const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
	expect(viewport).toContain('user-scalable=no');
	expect(viewport).toContain('maximum-scale=1');

	// pan-x pan-y keeps scrolling but forbids pinch and double-tap zoom.
	const touchAction = await page.evaluate(() => getComputedStyle(document.body).touchAction);
	expect(touchAction).toBe('pan-x pan-y');

	// iOS ignores the meta tag, so the gesture handler must be installed and must
	// cancel a pinch rather than let it through.
	const cancelled = await page.evaluate(() => {
		const event = new Event('gesturestart', { bubbles: true, cancelable: true });
		document.body.dispatchEvent(event);
		return event.defaultPrevented;
	});
	expect(cancelled).toBe(true);
});
