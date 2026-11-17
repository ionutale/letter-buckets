# LCP budget assertion never runs

- **Severity:** medium
- **Area:** test
- **Location:** `tests/e2e/performance.spec.ts:9`
- **Confidence:** certain

## What happens

Largest Contentful Paint is read with `performance.getEntriesByType('largest-contentful-paint')`, which returns an empty array unless a `PerformanceObserver` has been registered for that entry type. `metrics.lcp` is therefore always `0`, and the guarded assertion `if (metrics.lcp > 0)` is skipped. The startup test only ever checks DOMContentLoaded and load, so a 6-second LCP passes the "performance budget" test.

## Evidence

```ts
// tests/e2e/performance.spec.ts:7-20
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
```

Measured against this repo's own build (`node scripts/serve-preview.mjs`, then Chromium at `/en/`):

```
{"byType":[],"supported":true,"withObserver":[60]}
```

`PerformanceObserver.supportedEntryTypes` contains `largest-contentful-paint` and a buffered observer receives an entry at 60 ms, but `getEntriesByType` returns `[]`. The `if` guard then makes the 2.5 s budget dead code — the test cannot fail on LCP.

## Suggested fix

Collect LCP with a buffered observer registered before the page loads:

```ts
await page.addInitScript(() => {
	(window as any).__lcp = 0;
	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) (window as any).__lcp = entry.startTime;
	}).observe({ type: 'largest-contentful-paint', buffered: true });
});
await page.goto('/en/');
await expect(page.locator('a.play')).toBeVisible();
await page.waitForTimeout(500);
const lcp = await page.evaluate(() => (window as any).__lcp);
expect(lcp).toBeGreaterThan(0);
expect(lcp).toBeLessThan(2500);
```

Drop the `if`: a zero LCP should be a failure, not a skip.

## Test

Run `pnpm exec playwright test tests/e2e/performance.spec.ts --project=chromium` after the change and confirm the logged `lcp` is non-zero (60–200 ms on a local build). Then throttle the page (`page.route('**/*.js', route => route.fulfill({ delay: 3000, ... }))`) and confirm the test fails instead of silently skipping.
