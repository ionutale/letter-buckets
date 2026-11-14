import { describe, expect, it } from 'vitest';
import { gapCountForLevel, minWordLengthForLevel } from './rules.js';

describe('difficulty rules', () => {
	it('repeats the 1/2/3/4 gap ramp in every ten-level chapter', () => {
		for (let chapter = 0; chapter < 5; chapter++) {
			const base = chapter * 10;
			const expected = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];
			for (let position = 0; position < 10; position++) {
				expect(gapCountForLevel(base + position + 1)).toBe(expected[position]);
			}
		}
	});

	it('keeps at least two letters revealed', () => {
		for (let level = 1; level <= 50; level++) {
			expect(minWordLengthForLevel(level)).toBe(gapCountForLevel(level) + 2);
		}
	});
});
