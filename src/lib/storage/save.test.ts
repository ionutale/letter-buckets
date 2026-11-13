import { describe, expect, it } from 'vitest';
import {
	currentLevel,
	defaultSave,
	isLevelOpen,
	loadSave,
	markLevelComplete,
	markWordComplete,
	resetLevelWords,
	resetLocale,
	wordKey
} from './save.js';

function storage(initial?: string) {
	const map = new Map<string, string>(initial ? [['letter-buckets-save', initial]] : []);
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => void map.set(key, value)
	};
}

function clearLevel(data: ReturnType<typeof defaultSave>, locale: 'en', level: number) {
	for (const index of [0, 1, 2]) markWordComplete(data, locale, level, index);
}

describe('save', () => {
	it('starts every locale at level 1', () => {
		expect(currentLevel(defaultSave(), 'en')).toBe(1);
		expect(currentLevel(defaultSave(), 'ru')).toBe(1);
	});

	it('keeps progress separate per locale', () => {
		const data = defaultSave();
		clearLevel(data, 'en', 1);
		expect(currentLevel(data, 'en')).toBe(2);
		expect(currentLevel(data, 'ro')).toBe(1);
	});

	it('unlocks a word permanently even when the level is replayed', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0);
		resetLevelWords(data, 'en', 1);
		expect(data.locales.en.unlocked[wordKey(1, 0)]).toBe(true);
		expect(data.locales.en.levelWords[1]).toEqual([]);
	});

	it('falls back to a fresh save on corrupt data', () => {
		expect(loadSave(storage('not json'))).toEqual(defaultSave());
		expect(loadSave(storage('{"version":99}'))).toEqual(defaultSave());
	});

	it('marks the chapter stamp at the end of a chapter', () => {
		const data = defaultSave();
		markLevelComplete(data, 'en', 10);
		expect(data.locales.en.chapterStamps).toEqual([1]);
	});

	it('does not award a chapter stamp for a mid-chapter level', () => {
		const data = defaultSave();
		clearLevel(data, 'en', 1);
		expect(data.locales.en.chapterStamps).toEqual([]);
	});

	it('opens level 2 only after the whole first level is done', () => {
		const data = defaultSave();
		expect(isLevelOpen(data, 'en', 2)).toBe(false);
		markWordComplete(data, 'en', 1, 0);
		markWordComplete(data, 'en', 1, 1);
		expect(isLevelOpen(data, 'en', 2)).toBe(false);
		markWordComplete(data, 'en', 1, 2);
		expect(isLevelOpen(data, 'en', 2)).toBe(true);
		expect(currentLevel(data, 'en')).toBe(2);
	});

	it('does not duplicate a word index when it is completed twice', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0);
		markWordComplete(data, 'en', 1, 0);
		expect(data.locales.en.levelWords[1]).toEqual([0]);
	});

	it('sanitises out-of-range values on load', () => {
		const raw = JSON.stringify({
			version: 1,
			settings: { muted: 'yes' },
			locales: {
				en: {
					clearedThrough: 99,
					levelWords: { 1: [0, 9, 0], 51: [1], bad: [2] },
					unlocked: { '1:0': true, '99:0': true, '1:9': true, nope: true },
					chapterStamps: [0, 1, 1, 9]
				}
			}
		});
		const data = loadSave(storage(raw));
		expect(data.locales.en.clearedThrough).toBe(50);
		expect(data.locales.en.levelWords).toEqual({ 1: [0] });
		expect(data.locales.en.unlocked).toEqual({ '1:0': true });
		expect(data.locales.en.chapterStamps).toEqual([1]);
		expect(data.settings.muted).toBe(false);
	});

	it('resets only the requested locale', () => {
		const data = defaultSave();
		clearLevel(data, 'en', 1);
		markWordComplete(data, 'ro', 1, 0);
		resetLocale(data, 'en');
		expect(currentLevel(data, 'en')).toBe(1);
		expect(data.locales.ro.levelWords[1]).toEqual([0]);
	});
});
