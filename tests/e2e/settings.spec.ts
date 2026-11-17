import { expect, test } from '@playwright/test';
import { seedSave } from './helpers.js';

const seedInit = (enCleared: number, roCleared: number) => ({ enCleared, roCleared });

const seed = (page: import('@playwright/test').Page, enCleared: number, roCleared: number) =>
	page.addInitScript(
		(data) => {
			if (localStorage.getItem('letter-buckets-save')) return;
			localStorage.setItem(
				'letter-buckets-save',
				JSON.stringify({
					version: 1,
					settings: { muted: true, coachDone: true, installHintDismissed: true },
					locales: {
						en: {
							clearedThrough: data.enCleared,
							levelWords: {},
							unlocked: {},
							chapterStamps: []
						},
						ro: {
							clearedThrough: data.roCleared,
							levelWords: {},
							unlocked: {},
							chapterStamps: []
						}
					}
				})
			);
		},
		seedInit(enCleared, roCleared)
	);

test('switches language and URL together', async ({ page }) => {
	await page.goto('/en/settings');
	await page.getByRole('button', { name: 'Română', exact: true }).click();
	await expect(page).toHaveURL(/\/ro\/settings$/);
	await expect(page.getByRole('heading', { name: 'Setări', exact: true })).toBeVisible();
	await expect(page.locator('.note')).toHaveText('Ajutoarele automate nu consumă rezerva.');
});

test('keeps progress separate per language', async ({ page }) => {
	await seed(page, 4, 0);

	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/5');

	await page.goto('/en/settings');
	await page.getByRole('button', { name: 'Română', exact: true }).click();
	await expect(page).toHaveURL(/\/ro\/settings$/);
	await page.goto('/ro/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/ro/levels/1');

	await page.goto('/ro/settings');
	await page.getByRole('button', { name: 'English', exact: true }).click();
	await expect(page).toHaveURL(/\/en\/settings$/);
	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/5');
});

test('a level locked in the new language returns to the map with a toast', async ({ page }) => {
	await seed(page, 4, 0);
	await page.goto('/ro/levels/5');
	await expect(page).toHaveURL(/\/ro\/levels\?locked=1$/);
	await expect(page.getByRole('status')).toHaveText(
		'Nivelul acesta nu este deschis în această limbă.'
	);
});

test('a three-second hold resets only the current language', async ({ page }) => {
	await seed(page, 4, 2);
	await page.goto('/en/settings');

	const reset = page.locator('button.reset');
	await expect(reset).toBeVisible();
	// On a phone the grown-ups card starts below the fold, and mouse events are
	// viewport coordinates: scroll first so the press lands on the button.
	await reset.scrollIntoViewIfNeeded();
	const box = await reset.boundingBox();
	expect(box).not.toBeNull();
	if (!box) return;

	const centerX = box.x + box.width / 2;
	const centerY = box.y + box.height / 2;

	await page.mouse.move(centerX, centerY);
	await page.mouse.down();
	await page.waitForTimeout(600);
	await page.mouse.up();
	await expect(page.locator('.toast')).toHaveCount(0);

	await page.mouse.move(centerX, centerY);
	await page.mouse.down();
	await page.waitForTimeout(3200);
	await page.mouse.up();

	await expect(page.locator('.toast')).toHaveText('Progress reset.');

	await page.goto('/en/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/en/levels/1');

	await page.goto('/ro/');
	await expect(page.locator('a.play')).toHaveAttribute('href', '/ro/levels/3');
});

test('switches game mode and shows the manual hint budget', async ({ page }) => {
	await seedSave(page, { locale: 'en', clearedThrough: 14 });
	await page.goto('/en/settings');
	await page.getByRole('button', { name: /medium/i }).click();
	await expect(page.getByRole('button', { name: /medium/i })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('.note')).toHaveText('Automatic hints never use the reserve.');
	await expect(page.getByRole('button', { name: /medium/i })).toContainText(
		'15 manual hints per chapter.'
	);

	await page.reload();
	await expect(page.getByRole('button', { name: /medium/i })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.goto('/en/levels/5');
	await page.locator('button.bucket').first().click();
	const hint = page.locator('button.icon.hint');
	await expect(hint).toHaveAttribute('aria-label', 'Hint (15)');
	await hint.click();
	await expect(hint).toHaveAttribute('aria-label', 'Hint (14)');

	await page.reload();
	await page.locator('button.bucket').first().click();
	await expect(page.locator('button.icon.hint')).toHaveAttribute('aria-label', 'Hint (14)');

	// The budget is per chapter: a fresh chapter starts with a full reserve.
	await page.goto('/en/levels/15');
	await page.locator('button.bucket').first().click();
	await expect(page.locator('button.icon.hint')).toHaveAttribute('aria-label', 'Hint (15)');
});

test('hard mode locks the hint control at zero but keeps play and nudges working', async ({
	page
}) => {
	await seedSave(page, { locale: 'en', clearedThrough: 4, mode: 'hard' });
	// A frozen clock keeps the automatic ten-second nudge out of the manual
	// count until the test asks for it.
	await page.clock.install();
	await page.goto('/en/levels/5');
	await page.locator('button.bucket').first().click();

	const hint = page.locator('button.icon.hint');
	await expect(hint).toHaveAttribute('aria-label', 'Hint (5)');
	for (let press = 0; press < 5; press++) await hint.click();
	await expect(hint).toHaveAttribute('aria-label', 'Hint (0)');
	await expect(hint).toBeDisabled();
	await expect(page.locator('.hint-count')).toHaveText('0');

	// Normal play works with an empty reserve: close the first word and place
	// a letter in the next one by hand.
	await page.getByRole('button', { name: 'Close', exact: true }).click();
	await page.locator('button.bucket').nth(1).click();
	const slot = page.locator('[data-slot]:not([data-filled="true"])').first();
	const letter = await slot.getAttribute('data-letter');
	await page.locator(`[data-tile][data-letter="${letter}"]`).first().click();
	await slot.click();
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1);

	// Automatic hints still arrive without spending anything.
	await page.clock.runFor(31_000);
	await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(2);
	await expect(hint).toBeDisabled();

	// The spent reserve survives a reload.
	await page.reload();
	await page.locator('button.bucket').nth(2).click();
	await expect(page.locator('button.icon.hint')).toHaveAttribute('aria-label', 'Hint (0)');
	await expect(page.locator('button.icon.hint')).toBeDisabled();
});

test('volume sliders drive the live audio graph and mute suspends playback', async ({ page }) => {
	await page.addInitScript(() => {
		const log = { gain: [] as number[], suspend: 0, resume: 0, pause: 0 };
		(window as unknown as { __audio: typeof log }).__audio = log;
		const Orig = window.AudioContext;
		const origGain = Orig.prototype.createGain;
		Orig.prototype.createGain = function () {
			const node = origGain.call(this);
			const set = node.gain.setTargetAtTime.bind(node.gain);
			node.gain.setTargetAtTime = (value: number, time: number, constant: number) => {
				log.gain.push(Number(value.toFixed(3)));
				return set(value, time, constant);
			};
			return node;
		};
		const origSuspend = Orig.prototype.suspend;
		Orig.prototype.suspend = function () {
			log.suspend += 1;
			return origSuspend.call(this);
		};
		const origResume = Orig.prototype.resume;
		Orig.prototype.resume = function () {
			log.resume += 1;
			return origResume.call(this);
		};
		const origPause = HTMLMediaElement.prototype.pause;
		HTMLMediaElement.prototype.pause = function () {
			log.pause += 1;
			return origPause.call(this);
		};
	});

	await seedSave(page, { locale: 'en', muted: false });
	await page.goto('/en/settings');
	// Unlocking happens on the first tap; it also starts the music loop.
	await page.getByRole('heading', { name: 'Settings', exact: true }).click();

	const setSlider = async (id: string, value: number) => {
		await page.locator(id).evaluate((element, next) => {
			const input = element as HTMLInputElement;
			input.value = String(next);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}, value);
	};
	const lastGain = () =>
		page.evaluate(() => (window as unknown as { __audio: { gain: number[] } }).__audio.gain.at(-1));

	await setSlider('#volume-music', 0);
	expect(await lastGain()).toBe(0);
	await setSlider('#volume-music', 50);
	expect(await lastGain()).toBeCloseTo(0.08, 2);
	await setSlider('#volume-sfx', 50);
	expect(await lastGain()).toBeCloseTo(0.275, 2);
	await setSlider('#volume-voice', 50);
	expect(await lastGain()).toBeCloseTo(0.45, 2);

	const before = await page.evaluate(
		() => (window as unknown as { __audio: { suspend: number; pause: number } }).__audio
	);
	await page.locator('button.toggle').click();
	const muted = await page.evaluate(
		() => (window as unknown as { __audio: { suspend: number; pause: number } }).__audio
	);
	expect(muted.suspend).toBeGreaterThan(before.suspend);
	expect(muted.pause).toBeGreaterThan(before.pause);

	const beforeResume = await page.evaluate(
		() => (window as unknown as { __audio: { resume: number } }).__audio.resume
	);
	await page.locator('button.toggle').click();
	const resumed = await page.evaluate(
		() => (window as unknown as { __audio: { resume: number } }).__audio.resume
	);
	expect(resumed).toBeGreaterThan(beforeResume);
});

test('adjusts and persists music, effects and voice volumes', async ({ page }) => {
	await seedSave(page, { locale: 'en' });
	await page.goto('/en/settings');

	await expect(page.locator('input[type="range"]')).toHaveCount(3);
	const music = page.locator('#volume-music');
	await music.evaluate((element) => {
		const input = element as HTMLInputElement;
		input.value = '40';
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await expect(page.locator('output[for="volume-music"]')).toHaveText('40%');

	await page.reload();
	await expect(page.locator('#volume-music')).toHaveValue('40');
});
