import { describe, expect, it } from 'vitest';
import {
	currentLevel,
	defaultSave,
	isLevelOpen,
	loadSave,
	markLevelComplete,
	markWordComplete,
	persistSave,
	recordAttempt,
	resetLevelWords,
	resetLocale,
	hintsRemaining,
	hintsUsed,
	spendHint,
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

describe('metrics sanitisation', () => {
	it('adds zeroed metrics to a save written before metrics existed', () => {
		const raw = JSON.stringify({
			version: 1,
			settings: { muted: true, coachDone: true, installHintDismissed: true },
			locales: {
				en: {
					clearedThrough: 12,
					levelWords: { 12: [0, 1] },
					unlocked: { '12:0': true, '12:1': true },
					chapterStamps: [1]
				}
			}
		});
		const data = loadSave(storage(raw));
		expect(data.locales.en.clearedThrough).toBe(12);
		expect(data.locales.en.levelWords).toEqual({ 12: [0, 1] });
		expect(data.locales.en.chapterStamps).toEqual([1]);
		expect(data.locales.en.metrics.wordsCompleted).toBe(0);
		expect(data.locales.en.metrics.chapters).toEqual({});
	});

	it('ignores corrupt metric values without losing progress', () => {
		const raw = JSON.stringify({
			version: 1,
			locales: {
				en: {
					clearedThrough: 5,
					levelWords: { 1: [0] },
					unlocked: { '1:0': true },
					metrics: {
						wordsCompleted: 'many',
						wordsFirstTry: -2,
						wordsWithMistakes: 9,
						correctPlacements: -1,
						wrongPlacements: 'x',
						chapters: {
							1: { wordsCompleted: 2, wordsFirstTry: 5, wordsWithMistakes: 1 },
							9: { wordsCompleted: 3 },
							nope: { wordsCompleted: 4 }
						}
					}
				}
			}
		});
		const data = loadSave(storage(raw));
		const metrics = data.locales.en.metrics;
		expect(metrics.wordsCompleted).toBe(0);
		expect(metrics.wordsFirstTry).toBe(0);
		expect(metrics.wordsWithMistakes).toBe(0);
		expect(metrics.correctPlacements).toBe(0);
		expect(metrics.wrongPlacements).toBe(0);
		expect(Object.keys(metrics.chapters)).toEqual(['1']);
		// First-try and mistake totals may never exceed the completed words.
		expect(metrics.chapters[1]).toEqual({
			wordsCompleted: 2,
			wordsFirstTry: 2,
			wordsWithMistakes: 0,
			correctPlacements: 0,
			wrongPlacements: 0
		});
		expect(data.locales.en.clearedThrough).toBe(5);
		expect(data.locales.en.levelWords).toEqual({ 1: [0] });
	});

	it('keeps metrics through a persist and reload', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0, false);
		recordAttempt(data, 'en', 1, true);
		const store = storage();
		persistSave(data, store);
		expect(loadSave(store).locales.en.metrics).toEqual(data.locales.en.metrics);
	});
});

describe('metrics', () => {
	it('counts attempts and first-try words', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0, true);
		recordAttempt(data, 'en', 1, true);
		recordAttempt(data, 'en', 1, false);
		markWordComplete(data, 'en', 1, 1, false);

		expect(data.locales.en.metrics.wordsCompleted).toBe(2);
		expect(data.locales.en.metrics.wordsFirstTry).toBe(1);
		expect(data.locales.en.metrics.wordsWithMistakes).toBe(1);
		expect(data.locales.en.metrics.correctPlacements).toBe(1);
		expect(data.locales.en.metrics.wrongPlacements).toBe(1);
		expect(data.locales.en.metrics.chapters[1].wordsCompleted).toBe(2);
	});

	it('does not double-count a replayed word', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0, true);
		markWordComplete(data, 'en', 1, 0, false);
		expect(data.locales.en.metrics.wordsCompleted).toBe(1);
		expect(data.locales.en.metrics.wordsWithMistakes).toBe(0);
	});

	it('keeps word totals stable when a finished level is replayed but still counts attempts', () => {
		const data = defaultSave();
		for (const index of [0, 1, 2]) markWordComplete(data, 'en', 1, index, true);
		resetLevelWords(data, 'en', 1);

		recordAttempt(data, 'en', 1, false);
		for (const index of [0, 1, 2]) {
			markWordComplete(data, 'en', 1, index, index !== 0);
		}

		const metrics = data.locales.en.metrics;
		expect(metrics.wordsCompleted).toBe(3);
		expect(metrics.wordsFirstTry).toBe(3);
		expect(metrics.wordsWithMistakes).toBe(0);
		expect(metrics.correctPlacements).toBe(0);
		expect(metrics.wrongPlacements).toBe(1);
		expect(metrics.chapters[1].wordsCompleted).toBe(3);
		expect(data.locales.en.levelWords[1]).toEqual([0, 1, 2]);
		expect(data.locales.en.clearedThrough).toBe(1);
	});

	it('keeps metrics separate per locale', () => {
		const data = defaultSave();
		markWordComplete(data, 'en', 1, 0, false);
		markWordComplete(data, 'ro', 1, 0, true);
		recordAttempt(data, 'ro', 1, false);

		expect(data.locales.en.metrics.wordsWithMistakes).toBe(1);
		expect(data.locales.en.metrics.wrongPlacements).toBe(0);
		expect(data.locales.ro.metrics.wordsFirstTry).toBe(1);
		expect(data.locales.ro.metrics.wrongPlacements).toBe(1);
		expect(data.locales.ru.metrics.wordsCompleted).toBe(0);
	});

	it('files metrics under the chapter that owns the level', () => {
		const data = defaultSave();
		markLevelComplete(data, 'en', 10);
		markWordComplete(data, 'en', 1, 0, true);
		markWordComplete(data, 'en', 11, 0, false);
		recordAttempt(data, 'en', 11, false);

		const metrics = data.locales.en.metrics;
		expect(metrics.chapters[1]).toEqual({
			wordsCompleted: 1,
			wordsFirstTry: 1,
			wordsWithMistakes: 0,
			correctPlacements: 0,
			wrongPlacements: 0
		});
		expect(metrics.chapters[2]).toEqual({
			wordsCompleted: 1,
			wordsFirstTry: 0,
			wordsWithMistakes: 1,
			correctPlacements: 0,
			wrongPlacements: 1
		});
		expect(metrics.wordsCompleted).toBe(2);
	});

	it('ignores attempts outside the playable levels', () => {
		const data = defaultSave();
		recordAttempt(data, 'en', 0, true);
		recordAttempt(data, 'en', 51, false);
		recordAttempt(data, 'en', 1.5, true);
		expect(data.locales.en.metrics.correctPlacements).toBe(0);
		expect(data.locales.en.metrics.wrongPlacements).toBe(0);
		expect(data.locales.en.metrics.chapters).toEqual({});
	});
});

describe('hint budgets', () => {
	it('gives unlimited hints in easy mode', () => {
		const data = defaultSave();
		expect(hintsRemaining(data, 'en', 'easy', 1)).toBe(Number.POSITIVE_INFINITY);
		expect(spendHint(data, 'en', 'easy', 1)).toBe(true);
	});

	it('spends 15 per chapter in medium mode', () => {
		const data = defaultSave();
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(15);
		for (let i = 0; i < 15; i++) expect(spendHint(data, 'en', 'medium', 1)).toBe(true);
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(0);
		expect(spendHint(data, 'en', 'medium', 1)).toBe(false);
		expect(hintsRemaining(data, 'en', 'medium', 11)).toBe(15);
	});

	it('spends 5 per chapter in hard mode and keeps modes separate', () => {
		const data = defaultSave();
		for (let i = 0; i < 5; i++) expect(spendHint(data, 'en', 'hard', 10)).toBe(true);
		expect(hintsRemaining(data, 'en', 'hard', 10)).toBe(0);
		expect(hintsRemaining(data, 'en', 'medium', 10)).toBe(15);
	});

	it('never records usage in easy mode', () => {
		const data = defaultSave();
		for (let i = 0; i < 40; i++) expect(spendHint(data, 'en', 'easy', 3)).toBe(true);
		expect(hintsUsed(data, 'en', 'easy', 3)).toBe(0);
		expect(data.locales.en.hintUsage).toEqual({});
		expect(hintsRemaining(data, 'en', 'easy', 3)).toBe(Number.POSITIVE_INFINITY);
	});

	it('does not overspend a chapter budget', () => {
		const data = defaultSave();
		for (let i = 0; i < 15; i++) spendHint(data, 'en', 'medium', 1);
		expect(spendHint(data, 'en', 'medium', 1)).toBe(false);
		expect(hintsUsed(data, 'en', 'medium', 1)).toBe(15);
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(0);
	});

	it('keeps hint usage per locale', () => {
		const data = defaultSave();
		spendHint(data, 'en', 'medium', 1);
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(14);
		expect(hintsRemaining(data, 'ro', 'medium', 1)).toBe(15);
	});

	it('does not refill when switching modes away and back', () => {
		const data = defaultSave();
		spendHint(data, 'en', 'medium', 1);
		spendHint(data, 'en', 'hard', 1);

		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(14);
		expect(hintsRemaining(data, 'en', 'hard', 1)).toBe(4);
		// Choosing another mode is not a reset: going back keeps the spend.
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(14);
	});

	it('does not refill when a level is replayed or completed', () => {
		const data = defaultSave();
		spendHint(data, 'en', 'medium', 1);

		markWordComplete(data, 'en', 1, 0);
		resetLevelWords(data, 'en', 1);
		markLevelComplete(data, 'en', 1);

		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(14);
	});

	it('sanitises corrupt hint usage and caps overspent budgets', () => {
		const raw = JSON.stringify({
			version: 1,
			locales: {
				en: {
					clearedThrough: 0,
					levelWords: {},
					unlocked: {},
					chapterStamps: [],
					hintUsage: {
						'medium:1': -4,
						'hard:2': 'lots',
						'easy:1': 3,
						'ultra:1': 2,
						'medium:9': 7,
						'medium:3': 4.8,
						'hard:4': 99
					}
				}
			}
		});
		const data = loadSave(storage(raw));
		expect(data.locales.en.hintUsage).toEqual({
			'medium:1': 0,
			'hard:2': 0,
			'easy:1': 3,
			'medium:3': 4,
			'hard:4': 99
		});
		// Level 21 is in chapter 3, level 31 in chapter 4.
		expect(hintsUsed(data, 'en', 'medium', 21)).toBe(4);
		expect(hintsRemaining(data, 'en', 'medium', 21)).toBe(11);
		expect(hintsRemaining(data, 'en', 'hard', 31)).toBe(0);
	});

	it('starts a save written before hint budgets with a full reserve', () => {
		const raw = JSON.stringify({
			version: 1,
			locales: {
				en: { clearedThrough: 2, levelWords: {}, unlocked: {}, chapterStamps: [] }
			}
		});
		const data = loadSave(storage(raw));
		expect(data.locales.en.hintUsage).toEqual({});
		expect(hintsRemaining(data, 'en', 'medium', 1)).toBe(15);
		expect(hintsRemaining(data, 'en', 'hard', 1)).toBe(5);
	});

	it('keeps the reserve through a reload', () => {
		const data = defaultSave();
		spendHint(data, 'en', 'medium', 1);
		const store = storage();
		persistSave(data, store);
		expect(hintsRemaining(loadSave(store), 'en', 'medium', 1)).toBe(14);
	});

	it('defaults a missing or invalid game mode to easy', () => {
		const invalid = JSON.stringify({
			version: 1,
			settings: { mode: 'extreme' },
			locales: {}
		});
		expect(loadSave(storage(invalid)).settings.mode).toBe('easy');

		const medium = JSON.stringify({ version: 1, settings: { mode: 'medium' }, locales: {} });
		expect(loadSave(storage(medium)).settings.mode).toBe('medium');
	});
});
