import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

test('drags a letter with a real touch sequence', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'touch sequence is mobile-only');
	await seedSave(page);
	await page.goto('/en/levels/1');
	await page.locator('button.bucket').first().click();

	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	const letter = await slot.getAttribute('data-letter');
	const tile = page.locator(`[data-tile][data-letter="${letter}"]`).first();
	const tileBox = await tile.boundingBox();
	const slotBox = await slot.boundingBox();
	expect(tileBox).not.toBeNull();
	expect(slotBox).not.toBeNull();
	if (!tileBox || !slotBox) return;

	const client = await page.context().newCDPSession(page);
	const from = { x: tileBox.x + tileBox.width / 2, y: tileBox.y + tileBox.height / 2 };
	const to = { x: slotBox.x + slotBox.width / 2, y: slotBox.y + slotBox.height / 2 };

	await client.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ x: from.x, y: from.y }]
	});
	for (let step = 1; step <= 8; step++) {
		const ratio = step / 8;
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio }]
		});
	}
	await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
});
