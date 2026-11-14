import { describe, expect, it } from 'vitest';
import { CONTENT, LEVEL_COUNT } from './index.js';
import { validateContent } from './validate.js';

describe('content', () => {
	it('is valid in all five locales', () => {
		expect(validateContent(CONTENT)).toEqual([]);
	});
	it('has exactly 50 levels per locale', () => {
		for (const locale of Object.keys(CONTENT) as (keyof typeof CONTENT)[]) {
			expect(CONTENT[locale].levels).toHaveLength(LEVEL_COUNT);
		}
	});
	it('rejects a word that is too short for the level gaps', () => {
		const broken = structuredClone(CONTENT);
		broken.en.levels[9].words[0].word = 'HOUSE';
		const issues = validateContent(broken);
		expect(issues.some((i) => i.message.includes('too short'))).toBe(true);
	});
	it('rejects a word outside the locale alphabet', () => {
		const broken = structuredClone(CONTENT);
		broken.de.levels[0].words[0].word = 'STRAßE';
		const issues = validateContent(broken);
		expect(issues.some((i) => i.message.includes('ß'))).toBe(true);
	});
});
