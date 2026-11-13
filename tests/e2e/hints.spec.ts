import { expect, test, type Page } from '@playwright/test';

async function openFirstBucket(page: Page) {
	await page.getByRole('button', { name: /open word 1/i }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

const hintButton = (page: Page) => page.getByRole('button', { name: 'Hint', exact: true });

test('the hint chain places one letter and then waits', async ({ page }) => {
	await page.goto('/en/levels/1');
	await openFirstBucket(page);

	await hintButton(page).click();
	await hintButton(page).click();
	await hintButton(page).click();

	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
	await hintButton(page).click();
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
});

test('an idle word auto-places once and stops until the child interacts', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'letter-buckets-save',
			JSON.stringify({
				version: 1,
				settings: { muted: true, coachDone: true, installHintDismissed: true },
				locales: {
					en: {
						clearedThrough: 24,
						levelWords: {},
						unlocked: {},
						chapterStamps: [1, 2]
					}
				}
			})
		);
	});
	await page.clock.install();
	await page.goto('/en/levels/25');
	await openFirstBucket(page);

	await page.clock.runFor(31_000);
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);

	await page.clock.runFor(20_000);
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);

	// A real interaction unlocks the next cycle; three hint taps finish the
	// second gap of this two-gap word.
	const tile = page.locator('[data-tile]').first();
	await tile.click();
	await hintButton(page).click();
	await hintButton(page).click();
	await hintButton(page).click();
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(2);
});

test('leaving the level cancels the idle hint chain without saving progress', async ({ page }) => {
	await page.addInitScript(() => {
		if (localStorage.getItem('letter-buckets-save')) return;
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
	await page.clock.install();
	await page.goto('/en/levels');
	await page.locator('button.level[data-state="current"]').click();
	await page.getByRole('button', { name: /open word 1/i }).click();
	await page.goBack();
	await expect(page).toHaveURL(/\/en\/levels$/);

	await page.clock.runFor(60_000);
	const save = await page.evaluate(() => JSON.parse(localStorage.getItem('letter-buckets-save')!));
	expect(save.locales.en.levelWords).toEqual({});
	expect(save.locales.en.unlocked).toEqual({});
	expect(save.locales.en.clearedThrough).toBe(0);
});
