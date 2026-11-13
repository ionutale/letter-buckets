import { describe, expect, it } from 'vitest';
import type { LevelSession } from './session.svelte.js';
import { createLevelSession } from './session.svelte.js';
import { isComplete } from './puzzle.js';

function solveCurrentWord(session: LevelSession): void {
	let guard = 0;
	while (session.word && !isComplete(session.word) && guard++ < 12) {
		const gap = session.word.spec.gaps.find((slot) => !(slot in session.word!.placed));
		if (gap === undefined) break;
		const letter = session.word.spec.word[gap];
		const tile = session.word.remaining.find((entry) => entry.letter === letter);
		if (!tile) break;
		session.place(tile.id, gap);
	}
}

describe('level session', () => {
	it('starts with three closed buckets', () => {
		const session = createLevelSession(1, 'en');
		expect(session.buckets.map((bucket) => bucket.status)).toEqual(['closed', 'closed', 'closed']);
		expect(session.openIndex).toBeNull();
		expect(session.complete).toBe(false);
	});

	it('opens a bucket into a word puzzle', () => {
		const session = createLevelSession(1, 'en');
		session.openBucket(0);
		expect(session.openIndex).toBe(0);
		expect(session.word?.spec.word).toBe('CAT');
	});

	it('marks a bucket done and calls onWordComplete after the word', () => {
		const words: number[] = [];
		const session = createLevelSession(1, 'en', {
			onWordComplete: (_level, wordIndex) => words.push(wordIndex)
		});
		session.openBucket(0);
		solveCurrentWord(session);
		expect(session.buckets[0].status).toBe('done');
		expect(session.buckets[0].word).toBe('CAT');
		expect(words).toEqual([0]);
		expect(session.complete).toBe(false);
	});

	it('completes the level after all three words', () => {
		const words: number[] = [];
		const levels: number[] = [];
		const session = createLevelSession(1, 'en', {
			onWordComplete: (_level, wordIndex) => words.push(wordIndex),
			onLevelComplete: (level) => levels.push(level)
		});
		for (const index of [0, 1, 2]) {
			session.openBucket(index);
			solveCurrentWord(session);
			session.closeWord();
		}
		expect(session.buckets.every((bucket) => bucket.status === 'done')).toBe(true);
		expect(session.complete).toBe(true);
		expect(words).toEqual([0, 1, 2]);
		expect(levels).toEqual([1]);
	});

	it('restores completed buckets from saved progress', () => {
		const session = createLevelSession(1, 'en', {
			progress: {
				clearedThrough: 0,
				levelWords: { 1: [0, 1] },
				unlocked: {},
				chapterStamps: []
			}
		});
		expect(session.buckets.map((bucket) => bucket.status)).toEqual(['done', 'done', 'closed']);
		expect(session.buckets[0].word).toBe('CAT');
	});

	it('opens a completed bucket for review', () => {
		const session = createLevelSession(1, 'en', {
			progress: {
				clearedThrough: 0,
				levelWords: { 1: [0] },
				unlocked: {},
				chapterStamps: []
			}
		});
		session.openBucket(0);
		expect(session.openIndex).toBe(0);
		expect(session.word && isComplete(session.word)).toBe(true);
	});

	it('reset clears the in-memory level only', () => {
		const session = createLevelSession(1, 'en');
		session.openBucket(0);
		solveCurrentWord(session);
		session.closeWord();
		session.reset();
		expect(session.buckets.map((bucket) => bucket.status)).toEqual(['closed', 'closed', 'closed']);
		expect(session.complete).toBe(false);
	});

	it('does not call onWordComplete twice for the same word', () => {
		const words: number[] = [];
		const session = createLevelSession(1, 'en', {
			onWordComplete: (_level, wordIndex) => words.push(wordIndex)
		});
		session.openBucket(0);
		solveCurrentWord(session);
		session.openBucket(0);
		solveCurrentWord(session);
		expect(words).toEqual([0]);
	});

	it('walks the hint chain and auto-places only one letter', () => {
		const session = createLevelSession(25, 'en');
		session.openBucket(0);

		session.hint();
		expect(session.lastHint?.kind).toBe('pulse-slot');
		expect(session.hintStep).toBe(1);

		session.hint();
		expect(session.lastHint?.kind).toBe('pulse-tile');
		expect(session.hintStep).toBe(2);

		session.hint();
		expect(session.lastHint?.kind).toBe('auto-place');
		expect(session.hintStep).toBe(3);
		expect(Object.keys(session.word?.placed ?? {})).toHaveLength(1);

		// A deliberate hint press is an interaction, so it reopens the chain
		// with a pulse rather than placing another letter.
		session.hint();
		expect(session.lastHint?.kind).toBe('pulse-slot');
		expect(Object.keys(session.word?.placed ?? {})).toHaveLength(1);

		session.noteInteraction();
		expect(session.hintStep).toBe(0);
		session.hint();
		expect(session.lastHint?.kind).toBe('pulse-slot');
	});

	it('does not auto-place twice without a new interaction', () => {
		const session = createLevelSession(25, 'en');
		session.openBucket(0);
		session.hint();
		session.hint();
		session.hint();
		const placed = Object.keys(session.word?.placed ?? {}).length;
		session.hint();
		session.hint();
		expect(Object.keys(session.word?.placed ?? {}).length).toBe(placed);
	});
});
