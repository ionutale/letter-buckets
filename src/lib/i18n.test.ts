import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LOCALES = ['ro', 'it', 'en', 'de', 'ru'] as const;
const read = (locale: string) =>
	JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));

describe('messages', () => {
	it('has the same non-empty keys in every locale', () => {
		const base = read('en');
		const keys = Object.keys(base).sort();
		for (const locale of LOCALES) {
			const messages = read(locale);
			expect(Object.keys(messages).sort()).toEqual(keys);
			for (const key of keys) expect(messages[key].trim()).not.toBe('');
		}
	});
});
