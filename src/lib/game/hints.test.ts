import { describe, expect, it } from 'vitest';
import { buildPuzzle, createPuzzleState, hintTarget } from './puzzle.js';
import { nextHintAction } from './hints.js';

const spec = buildPuzzle({ level: 1, wordIndex: 0, word: 'CAT', locale: 'en' });
const state = createPuzzleState(spec);

describe('nextHintAction', () => {
	it('pulses the slot, then the tile, then auto-places once', () => {
		const slot = spec.gaps[0];
		expect(nextHintAction(state, 0)).toEqual({ kind: 'pulse-slot', slot });
		const target = hintTarget(state)!;
		expect(nextHintAction(state, 1)).toEqual({ kind: 'pulse-tile', tileId: target.tileId });
		expect(nextHintAction(state, 2)).toEqual({
			kind: 'auto-place',
			slot,
			tileId: target.tileId
		});
		expect(nextHintAction(state, 3)).toEqual({ kind: 'locked' });
	});

	it('is locked when the word is complete', () => {
		const slot = spec.gaps[0];
		const complete = {
			...state,
			placed: { [slot]: spec.word[slot] },
			remaining: state.remaining.filter((tile) => tile.letter !== spec.word[slot])
		};
		expect(nextHintAction(complete, 0)).toEqual({ kind: 'locked' });
	});
});
