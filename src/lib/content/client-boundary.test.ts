import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('client content boundary', () => {
	it('does not re-export the node-only validator from the client barrel', () => {
		const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
		expect(source).not.toContain('validate.js');
		expect(source).not.toContain('validateContent');
	});

	it('keeps node builtins out of the modules the client loads', () => {
		const files = [
			'index.ts',
			'schema.ts',
			'rules.ts',
			'themes.ts',
			'levels.en.ts',
			'levels.ro.ts',
			'levels.it.ts',
			'levels.de.ts',
			'levels.ru.ts'
		];
		for (const file of files) {
			const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
			expect(source, file).not.toMatch(/from ['"]node:/);
		}
	});
});
