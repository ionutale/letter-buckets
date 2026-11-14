import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT, getWordArt } from './index.js';

describe('word clue assets', () => {
	it('has an image for every word in every locale', () => {
		for (const [locale, data] of Object.entries(CONTENT)) {
			for (const level of data.levels) {
				for (let index = 0; index < 3; index++) {
					const path = getWordArt(locale as keyof typeof CONTENT, level.id, index);
					expect(existsSync(resolve('static', path.slice(1))), path).toBe(true);
				}
			}
		}
	});
});
