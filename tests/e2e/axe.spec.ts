import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

async function assertNoSeriousViolations(page: import('@playwright/test').Page) {
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	const serious = results.violations.filter(
		(violation) => violation.impact === 'critical' || violation.impact === 'serious'
	);
	expect(
		serious.map((violation) => ({
			id: violation.id,
			impact: violation.impact,
			nodes: violation.nodes.map((node) => node.target)
		}))
	).toEqual([]);
}

test('home, map and settings have no serious axe violations', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/');
	await assertNoSeriousViolations(page);

	await page.goto('/en/levels');
	await assertNoSeriousViolations(page);

	await page.goto('/en/settings');
	await assertNoSeriousViolations(page);

	await page.goto('/en/progress');
	await assertNoSeriousViolations(page);
});

test('the level, word panel and Word Book have no serious axe violations', async ({ page }) => {
	await seedSave(page);
	await page.goto('/en/levels/1');
	await assertNoSeriousViolations(page);

	await page.locator('button.bucket').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await assertNoSeriousViolations(page);

	await page.goto('/en/words');
	await assertNoSeriousViolations(page);
});
