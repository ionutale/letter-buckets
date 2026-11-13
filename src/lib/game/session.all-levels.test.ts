import { describe, expect, it } from 'vitest';
import { isComplete } from './puzzle.js';
import { createLevelSession } from './session.svelte.js';

const LOCALES = ['ro', 'it', 'en', 'de', 'ru'] as const;

describe('all content', () => {
	it('completes every one of the 50 levels in all five locales', () => {
		for (const locale of LOCALES) {
			for (let level = 1; level <= 50; level++) {
				const completed: number[] = [];
				const session = createLevelSession(level, locale, {
					onLevelComplete: (value) => completed.push(value)
				});

				for (const index of [0, 1, 2]) {
					session.openBucket(index);
					let guard = 0;
					while (session.word && !isComplete(session.word) && guard++ < 8) {
						const gap = session.word.spec.gaps.find((slot) => !(slot in session.word!.placed));
						if (gap === undefined) break;
						const tile = session.word.remaining.find(
							(entry) => entry.letter === session.word!.spec.word[gap]
						);
						if (!tile) break;
						session.place(tile.id, gap);
					}
					expect(isComplete(session.word!)).toBe(true);
					session.closeWord();
				}

				expect(session.complete).toBe(true);
				expect(completed).toEqual([level]);
			}
		}
	});
});
