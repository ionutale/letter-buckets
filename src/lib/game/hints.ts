import { hintTarget, type PuzzleState } from './puzzle.js';

export type HintAction =
	| { kind: 'pulse-slot'; slot: number }
	| { kind: 'pulse-tile'; tileId: string }
	| { kind: 'auto-place'; tileId: string; slot: number }
	| { kind: 'locked' };

/** The next gentle nudge for the current word and hint step. */
export function nextHintAction(state: PuzzleState, step: 0 | 1 | 2 | 3): HintAction {
	const target = hintTarget(state);
	if (!target) return { kind: 'locked' };
	if (step === 0) return { kind: 'pulse-slot', slot: target.slot };
	if (step === 1) return { kind: 'pulse-tile', tileId: target.tileId };
	if (step === 2) return { kind: 'auto-place', slot: target.slot, tileId: target.tileId };
	return { kind: 'locked' };
}
