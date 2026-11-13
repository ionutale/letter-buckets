import { describe, expect, it } from 'vitest';
import type { PuzzleSpec } from './puzzle.js';
import {
	buildPuzzle,
	createPuzzleState,
	hintTarget,
	isComplete,
	placeTile
} from './puzzle.js';

describe('buildPuzzle', () => {
	it('puts the only gap on the final letter at level 1', () => {
		const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
		expect(spec.gaps).toEqual([2]);
		expect(spec.decoys).toEqual([]);
	});

	it('is deterministic for the same level, word and locale', () => {
		const a = buildPuzzle({ level: 27, wordIndex: 1, word: 'HOUSE', locale: 'en' });
		const b = buildPuzzle({ level: 27, wordIndex: 1, word: 'HOUSE', locale: 'en' });
		expect(a).toEqual(b);
	});

	it('never leaves fewer than two revealed letters', () => {
		for (const word of ['CAT', 'BALL', 'HOUSE', 'FLOWER']) {
			for (let level = 1; level <= 50; level++) {
				const spec = buildPuzzle({ level, wordIndex: 0, word, locale: 'en' });
				expect(spec.gaps.length).toBeLessThanOrEqual(Math.min(3, word.length - 2));
				expect(new Set(spec.gaps).size).toBe(spec.gaps.length);
				expect(spec.gaps.length).toBeGreaterThan(0);
			}
		}
	});

	it('adds confusable decoys only in the late bands', () => {
		const early = buildPuzzle({ level: 20, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		const late = buildPuzzle({ level: 45, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		expect(early.decoys).toHaveLength(0);
		expect(late.decoys).toHaveLength(2);
		for (const decoy of late.decoys) expect(late.word).not.toContain(decoy);
	});

	it('uses the level band for the gap count', () => {
		expect(buildPuzzle({ level: 10, wordIndex: 0, word: 'HOUSE', locale: 'en' }).gaps).toHaveLength(1);
		expect(buildPuzzle({ level: 25, wordIndex: 0, word: 'HOUSE', locale: 'en' }).gaps).toHaveLength(2);
		expect(buildPuzzle({ level: 45, wordIndex: 0, word: 'HOUSE', locale: 'en' }).gaps).toHaveLength(3);
		expect(buildPuzzle({ level: 45, wordIndex: 0, word: 'BALL', locale: 'en' }).gaps).toHaveLength(2);
	});
});

describe('placeTile', () => {
	it('places the correct letter and completes the word', () => {
		const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
		const state = createPuzzleState(spec);
		const tile = state.remaining.find((t) => t.letter === 'T')!;
		const result = placeTile(state, tile.id, 2);
		expect(result.outcome).toBe('placed');
		expect(isComplete(result.state)).toBe(true);
	});

	it('rejects a letter that belongs to another empty slot and suggests it', () => {
		const twoGap = buildPuzzle({ level: 25, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		const state = createPuzzleState(twoGap);
		const [slotA, slotB] = twoGap.gaps;
		const wrong = state.remaining.find((t) => t.letter === twoGap.word[slotB])!;
		const result = placeTile(state, wrong.id, slotA);
		expect(result.outcome).toBe('wrong-word');
		expect(result.suggestedSlot).toBe(slotB);
	});

	it('rejects a decoy with a plain wrong outcome', () => {
		const late = buildPuzzle({ level: 45, wordIndex: 0, word: 'HOUSE', locale: 'en' });
		const state = createPuzzleState(late);
		const decoy = state.remaining.find((t) => t.decoy)!;
		const result = placeTile(state, decoy.id, late.gaps[0]);
		expect(result.outcome).toBe('wrong');
	});

	it('keeps both identical tiles for a repeated letter', () => {
		const ball: PuzzleSpec = {
			level: 25,
			wordIndex: 0,
			word: 'BALL',
			gaps: [2, 3],
			decoys: []
		};
		const state = createPuzzleState(ball);
		const ls = state.remaining.filter((t) => t.letter === 'L');
		expect(ls).toHaveLength(2);
		expect(new Set(ls.map((t) => t.id)).size).toBe(2);
		const first = placeTile(state, ls[0].id, 2);
		expect(first.state.remaining.filter((t) => t.letter === 'L')).toHaveLength(1);
	});

	it('does not place into a filled slot', () => {
		const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
		const state = createPuzzleState(spec);
		const t = state.remaining.find((tile) => tile.letter === 'T')!;
		const placed = placeTile(state, t.id, 2).state;
		const again = placeTile(placed, t.id, 2);
		expect(again.outcome).toBe('wrong');
	});
});

describe('hintTarget', () => {
	it('points at the first empty slot and its matching tile', () => {
		const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
		const state = createPuzzleState(spec);
		const target = hintTarget(state);
		expect(target?.slot).toBe(2);
		expect(state.remaining.find((t) => t.id === target?.tileId)?.letter).toBe('T');
	});
});
