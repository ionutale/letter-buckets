import { expect, test } from '@playwright/test';

interface Metrics {
	__lcp?: number;
}

test('the home screen meets a basic startup performance budget', async ({ page }) => {
	// `performance.getEntriesByType('largest-contentful-paint')` stays empty
	// unless an observer was registered for that entry type, so collect LCP with
	// a buffered observer before the page scripts run.
	await page.addInitScript(() => {
		const metrics: Metrics = { __lcp: 0 };
		(window as unknown as { __metrics: Metrics }).__metrics = metrics;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) metrics.__lcp = entry.startTime;
		}).observe({ type: 'largest-contentful-paint', buffered: true });
	});
	await page.goto('/en/');
	await expect(page.locator('a.play')).toBeVisible();
	await page.waitForTimeout(500);

	const metrics = await page.evaluate(() => {
		const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		const paint = performance.getEntriesByName('first-contentful-paint').at(-1);
		return {
			dcl: nav?.domContentLoadedEventEnd ?? 0,
			load: nav?.loadEventEnd ?? 0,
			fcp: paint?.startTime ?? 0,
			lcp: (window as unknown as { __metrics: Metrics }).__metrics.__lcp ?? 0
		};
	});

	expect(metrics.dcl).toBeGreaterThan(0);
	expect(metrics.dcl).toBeLessThan(2000);
	expect(metrics.load).toBeLessThan(3000);
	// A zero metric is a failure, not a skip: paint entries must be observed.
	expect(metrics.fcp).toBeGreaterThan(0);
	expect(metrics.fcp).toBeLessThan(2500);
	expect(metrics.lcp).toBeGreaterThan(0);
	expect(metrics.lcp).toBeLessThan(2500);
});
