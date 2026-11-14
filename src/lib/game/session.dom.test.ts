import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelSession } from './session.svelte.js';
import { createLevelSession } from './session.svelte.js';

function placedCount(session: LevelSession): number {
	return Object.keys(session.word?.placed ?? {}).length;
}

describe('automatic hints', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('places a letter on the idle timer without spending a hint', () => {
		let used = 0;
		const session = createLevelSession(25, 'en', { onHintUsed: () => used++ });
		session.openBucket(0);

		vi.advanceTimersByTime(10_000);
		expect(session.hintStep).toBe(1);
		expect(used).toBe(0);

		vi.advanceTimersByTime(20_000);
		expect(placedCount(session)).toBe(1);
		expect(used).toBe(0);
	});

	it('keeps nudging when the manual reserve is empty', () => {
		let used = 0;
		const session = createLevelSession(25, 'en', {
			canHint: () => false,
			onHintUsed: () => used++
		});
		session.openBucket(0);

		vi.advanceTimersByTime(30_000);
		expect(placedCount(session)).toBe(1);
		expect(used).toBe(0);
	});
});
