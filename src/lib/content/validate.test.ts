import { describe, expect, it } from 'vitest';
import { CONTENT, LEVEL_COUNT, PACKAGE_2, PACKAGE_3 } from './index.js';
import { packageAssetFolder, validateContent } from './validate.js';

describe('content', () => {
	it('is valid in all five locales', () => {
		expect(validateContent(CONTENT)).toEqual([]);
	});
	it("checks each package's own asset folders", () => {
		expect(packageAssetFolder('p1').clips).toBe('audio/words');
		expect(packageAssetFolder('p2').clips).toBe('audio/p2/words');
		expect(packageAssetFolder('p3').levels).toBe('art/p3/levels');
	});

	it('validates package 2 in all five locales', () => {
		expect(validateContent(PACKAGE_2)).toEqual([]);
	});
	it('validates package 3 in all five locales', () => {
		expect(validateContent(PACKAGE_3)).toEqual([]);
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
