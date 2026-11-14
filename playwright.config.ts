import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
			testMatch: /cross-browser\.spec\.ts/
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			testMatch: /cross-browser\.spec\.ts/
		}
	],
	webServer: {
		// `exec` hands the shell over to the preview server so Playwright's
		// shutdown signal reaches node instead of a parent that leaves an
		// orphan holding stdout open (which hangs CI after the last test).
		command: 'pnpm build && exec node scripts/serve-preview.mjs',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
