import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LOCALES = ['ro', 'it', 'en', 'de', 'ru'] as const;

const read = (locale: string): Record<string, string> =>
	JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));

describe('message key parity', () => {
	it('every locale has exactly the same message keys', () => {
		const expected = Object.keys(read('en')).sort();
		expect(expected.length).toBeGreaterThan(0);
		for (const locale of LOCALES) {
			const keys = Object.keys(read(locale)).sort();
			expect(keys, `${locale} is missing or has extra message keys`).toEqual(expected);
		}
	});
});
