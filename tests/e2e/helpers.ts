import { expect, type Page } from '@playwright/test';

export interface SeedOptions {
	locale?: string;
	clearedThrough?: number;
	levelWords?: Record<number, number[]>;
	unlocked?: Record<string, true>;
	chapterStamps?: number[];
	hintUsage?: Record<string, number>;
	mode?: 'easy' | 'medium' | 'hard';
	muted?: boolean;
	coachDone?: boolean;
	installHintDismissed?: boolean;
}

const LOCALES = ['ro', 'it', 'en', 'de', 'ru'];

export async function seedSave(page: Page, options: SeedOptions = {}): Promise<void> {
	await page.addInitScript(
		({ options, locales }) => {
			if (localStorage.getItem('letter-buckets-save')) return;
			const target = options.locale ?? 'en';
			const progress = {
				clearedThrough: options.clearedThrough ?? 0,
				levelWords: options.levelWords ?? {},
				unlocked: options.unlocked ?? {},
				chapterStamps: options.chapterStamps ?? [],
				hintUsage: options.hintUsage ?? {}
			};
			const all = {};
			for (const key of locales) {
				all[key] =
					key === target
						? progress
						: { clearedThrough: 0, levelWords: {}, unlocked: {}, chapterStamps: [], hintUsage: {} };
			}
			localStorage.setItem(
				'letter-buckets-save',
				JSON.stringify({
					version: 1,
					settings: {
						muted: options.muted ?? true,
						coachDone: options.coachDone ?? true,
						installHintDismissed: options.installHintDismissed ?? true,
						mode: options.mode ?? 'easy'
					},
					locales: all
				})
			);
		},
		{ options, locales: LOCALES }
	);
}

export async function solveOpenWord(page: Page): Promise<void> {
	for (let guard = 0; guard < 5; guard++) {
		const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
		if ((await slot.count()) === 0) break;
		const letter = await slot.getAttribute('data-letter');
		const tile = page.locator(`[data-tile][data-letter="${letter}"]`).first();
		await tile.click();
		await slot.click();
	}
	await expect(page.locator('.done-title')).toBeVisible();
	await page.locator('.done-card button.back').click();
}

export async function solveLevel(page: Page): Promise<void> {
	for (let index = 0; index < 3; index++) {
		await page.locator('button.bucket').nth(index).click();
		await solveOpenWord(page);
	}
}
