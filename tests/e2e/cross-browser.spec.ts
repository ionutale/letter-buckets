import { expect, test } from '@playwright/test';
import { seedSave, solveOpenWord } from './helpers.js';

test('the core loop works in the current browser engine', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await expect(page.locator('button.bucket')).toHaveCount(3);
	await page.locator('button.bucket').first().click();
	await solveOpenWord(page);
	await expect(page.locator('button.bucket[data-state="done"]')).toHaveCount(1);
});
