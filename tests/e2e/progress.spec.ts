import { expect, test } from '@playwright/test';
import { seedSave, solveOpenWord } from './helpers.js';

test('shows completed words, mistakes and letter accuracy', async ({ page }) => {
	await seedSave(page, { locale: 'en', clearedThrough: 5 });
	await page.goto('/en/levels/6');
	await page.locator('button.bucket').first().click();

	const gaps = await page
		.locator('[data-slot]')
		.evaluateAll((slots) => slots.map((slot) => Number(slot.getAttribute('data-slot'))));
	const secondLetter = await page.locator(`[data-slot="${gaps[1]}"]`).getAttribute('data-letter');
	await page.locator(`[data-tile][data-letter="${secondLetter}"]`).first().click();
	await page.locator(`[data-slot="${gaps[0]}"]`).click();

	await solveOpenWord(page);
	await page.goto('/en/progress');

	await expect(page.locator('.stat', { hasText: 'Words completed' }).locator('strong')).toHaveText(
		'1'
	);
	await expect(page.locator('.stat', { hasText: 'First try' }).locator('strong')).toHaveText('0');
	await expect(page.locator('.stat', { hasText: 'With mistakes' }).locator('strong')).toHaveText(
		'1'
	);
	await expect(
		page.locator('.letters', { hasText: 'Wrong letters' }).getByText('1', { exact: true })
	).toBeVisible();
	await expect(page.locator('.stat.accent strong')).toHaveText('67%');

	await expect(page.locator('.chapter')).toHaveCount(5);
	const firstChapter = page.locator('.chapter[data-chapter="1"]');
	await expect(firstChapter).toContainText('Words completed: 1');
	await expect(firstChapter).toContainText('With mistakes: 1');
	await expect(firstChapter).toContainText(/Correct letters: \d+/);
	await expect(firstChapter).toContainText('Wrong letters: 1');
	await expect(firstChapter.locator('.chapter-head b')).not.toHaveText('—');
});

test('is reachable from home and shows an empty state before any progress', async ({ page }) => {
	await seedSave(page, { locale: 'en' });
	await page.goto('/en/');
	await page.getByRole('link', { name: 'Progress', exact: true }).click();

	await expect(page).toHaveURL(/\/en\/progress$/);
	await expect(page.locator('.empty')).toHaveText('No words completed yet.');
	await expect(page.locator('.stat')).toHaveCount(0);
});

test('renders localized copy in every language', async ({ page }) => {
	await seedSave(page, { locale: 'en' });
	const headings: [string, string][] = [
		['/en/progress', 'Progress'],
		['/it/progress', 'Progressi'],
		['/de/progress', 'Fortschritt'],
		['/ro/progress', 'Progres'],
		['/ru/progress', 'Прогресс']
	];

	for (const [path, heading] of headings) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
		await expect(page.locator('.empty')).toBeVisible();
	}
});
