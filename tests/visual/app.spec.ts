import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page, locale: string, unlocked: boolean) {
	await page.addInitScript(
		({ locale, unlocked }) => {
			if (localStorage.getItem('letter-buckets-save')) return;
			const progress = unlocked
				? {
						clearedThrough: 0,
						levelWords: { 1: [0, 1] },
						unlocked: { '1:0': true, '1:1': true },
						chapterStamps: []
					}
				: {
						clearedThrough: 0,
						levelWords: {},
						unlocked: {},
						chapterStamps: []
					};
			const locales: Record<string, unknown> = {};
			for (const key of ['ro', 'it', 'en', 'de', 'ru']) {
				locales[key] =
					key === locale
						? progress
						: {
								clearedThrough: 0,
								levelWords: {},
								unlocked: {},
								chapterStamps: []
							};
			}
			localStorage.setItem(
				'letter-buckets-save',
				JSON.stringify({
					version: 1,
					settings: { muted: true, coachDone: true, installHintDismissed: true },
					locales
				})
			);
		},
		{ locale, unlocked }
	);
}

/** Waits for the progressive download queue so the bar is never in a shot. */
async function settle(page: import('@playwright/test').Page): Promise<void> {
	await page
		.waitForFunction(() => localStorage.getItem('letter-buckets-downloads') !== null, null, {
			timeout: 60_000
		})
		.catch(() => undefined);
}

for (const locale of ['en', 'ro', 'it', 'de', 'ru']) {
	test(`home, level, word panel and Word Book in ${locale}`, async ({ page }) => {
		await seed(page, locale, false);
		await page.goto(`/${locale}/`);
		await settle(page);
		await expect(page.locator('a.play')).toBeVisible();
		await expect(page).toHaveScreenshot(`home-${locale}.png`);

		await page.goto(`/${locale}/levels/1`);
		await settle(page);
		await expect(page.locator('button.bucket').first()).toBeVisible();
		await expect(page).toHaveScreenshot(`level-${locale}.png`);

		await page.locator('button.bucket').first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page).toHaveScreenshot(`word-${locale}.png`);

		await page.evaluate((locale) => {
			const raw = localStorage.getItem('letter-buckets-save');
			if (!raw) return;
			const data = JSON.parse(raw);
			data.locales[locale].levelWords = { 1: [0, 1] };
			data.locales[locale].unlocked = { '1:0': true, '1:1': true };
			localStorage.setItem('letter-buckets-save', JSON.stringify(data));
		}, locale);

		await page.goto(`/${locale}/words`);
		await settle(page);
		await expect(page.locator('.chip').first()).toBeVisible();
		await expect(page).toHaveScreenshot(`book-${locale}.png`, { fullPage: true });
	});
}
