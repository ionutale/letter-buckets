import { expect, test } from '@playwright/test';

test('the home screen meets a basic startup performance budget', async ({ page }) => {
	await page.goto('/en/');
	await expect(page.locator('a.play')).toBeVisible();

	const metrics = await page.evaluate(() => {
		const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);
		return {
			dcl: nav?.domContentLoadedEventEnd ?? 0,
			load: nav?.loadEventEnd ?? 0,
			lcp: lcp?.startTime ?? 0
		};
	});

	expect(metrics.dcl).toBeGreaterThan(0);
	expect(metrics.dcl).toBeLessThan(2000);
	expect(metrics.load).toBeLessThan(3000);
	if (metrics.lcp > 0) expect(metrics.lcp).toBeLessThan(2500);
});
