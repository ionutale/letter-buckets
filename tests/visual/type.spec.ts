import { expect, test } from '@playwright/test';

test('every playable glyph renders at tile size', async ({ page }) => {
	await page.goto('/en/dev/type');
	await expect(page.getByRole('heading', { name: 'Type check' })).toBeVisible();
	await expect(page).toHaveScreenshot('type.png', { fullPage: true });
});
