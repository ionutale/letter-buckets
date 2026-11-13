import { expect, test, type Page } from '@playwright/test';

async function openFirstBucket(page: Page) {
	await page.getByRole('button', { name: /open word 1/i }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

async function missingSlot(page: Page) {
	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	await expect(slot).toBeVisible();
	return slot;
}

test('fills a gap by tapping the tile and then the slot', async ({ page }) => {
	await page.goto('/en/levels/1');
	await openFirstBucket(page);

	const slot = await missingSlot(page);
	const letter = await slot.getAttribute('data-letter');
	const tile = page.locator(`[data-tile][data-letter="${letter}"]`).first();

	await tile.click();
	await expect(tile).toHaveAttribute('data-state', 'selected');
	await slot.click();

	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
	await expect(page.locator('.done-title')).toHaveText('Word complete!');
	await expect(page.getByRole('button', { name: /back to buckets/i })).toBeVisible();
});

test('fills a gap by dragging the tile into the slot', async ({ page }) => {
	await page.goto('/en/levels/1');
	await openFirstBucket(page);

	const slot = await missingSlot(page);
	const letter = await slot.getAttribute('data-letter');
	const tile = page.locator(`[data-tile][data-letter="${letter}"]`).first();

	const tileBox = await tile.boundingBox();
	const slotBox = await slot.boundingBox();
	expect(tileBox).not.toBeNull();
	expect(slotBox).not.toBeNull();
	if (!tileBox || !slotBox) return;

	await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2, {
		steps: 8
	});
	await page.mouse.up();

	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
});

test('a wrong letter returns to the tray', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: true },
				locales: {
					en: {
						clearedThrough: 30,
						levelWords: {},
						unlocked: {},
						chapterStamps: [1, 2, 3]
					}
				}
			})
		);
	});

	await page.goto('/en/levels/31');
	await openFirstBucket(page);

	const slot = await missingSlot(page);
	const slotLetter = await slot.getAttribute('data-letter');
	const wrongLetter = await page.evaluate((wanted) => {
		const tiles = [...document.querySelectorAll('[data-tile]')];
		const candidate = tiles.find((tile) => tile.getAttribute('data-letter') !== wanted);
		return candidate?.getAttribute('data-letter') ?? null;
	}, slotLetter);

	expect(wrongLetter).not.toBeNull();
	const tile = page.locator(`[data-tile][data-letter="${wrongLetter}"]`).first();
	await tile.click();
	await slot.click();

	await expect(slot).toHaveAttribute('data-filled', 'false');
	await expect(tile).toBeVisible();
});
