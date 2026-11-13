import { expect, test } from '@playwright/test';

const seedInit = (enCleared: number, roCleared: number) => ({ enCleared, roCleared });

const seed = (page: import('@playwright/test').Page, enCleared: number, roCleared: number) =>
	page.addInitScript(
		(data) => {
			if (localStorage.getItem('letter-buckets-save')) return;
			localStorage.setItem(
				'letter-buckets-save',
				JSON.stringify({
					version: 1,
					settings: { muted: true, coachDone: true, installHintDismissed: true },
					locales: {
						en: {
							clearedThrough: data.enCleared,
							levelWords: {},
							unlocked: {},
							chapterStamps: []
						},
						ro: {
							clearedThrough: data.roCleared,
							levelWords: {},
							unlocked: {},
							chapterStamps: []
						}
					}
				})
			);
		},
		seedInit(enCleared, roCleared)
	);

test('switches language and URL together', async ({ page }) => {
	await page.goto('/en/settings');
	await page.getByRole('button', { name: 'Română', exact: true }).click();
	await expect(page).toHaveURL(/\/ro\/settings$/);
	await expect(page.getByRole('heading', { name: 'Setări', exact: true })).toBeVisible();
});

test('keeps progress separate per language', async ({ page }) => {
	await seed(page, 4, 0);

	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/5');

	await page.goto('/en/settings');
	await page.getByRole('button', { name: 'Română', exact: true }).click();
	await expect(page).toHaveURL(/\/ro\/settings$/);
	await page.goto('/ro/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/ro/levels/1');

	await page.goto('/ro/settings');
	await page.getByRole('button', { name: 'English', exact: true }).click();
	await expect(page).toHaveURL(/\/en\/settings$/);
	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/5');
});

test('a level locked in the new language returns to the map with a toast', async ({ page }) => {
	await seed(page, 4, 0);
	await page.goto('/ro/levels/5');
	await expect(page).toHaveURL(/\/ro\/levels\?locked=1$/);
	await expect(page.getByRole('status')).toHaveText(
		'Nivelul acesta nu este deschis în această limbă.'
	);
});

test('a three-second hold resets only the current language', async ({ page }) => {
	await seed(page, 4, 2);
	await page.goto('/en/settings');

	const reset = page.locator('button.reset');
	await expect(reset).toBeVisible();
	const box = await reset.boundingBox();
	expect(box).not.toBeNull();
	if (!box) return;

	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(3200);
	await page.mouse.up();

	await expect(page.getByRole('status')).toHaveText('Progress reset.');

	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/1');

	await page.goto('/ro/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/ro/levels/3');
});
