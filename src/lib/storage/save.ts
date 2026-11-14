import type { Locale } from '../content/schema.js';
import { LOCALES } from '../content/schema.js';

export type GameMode = 'easy' | 'medium' | 'hard';

export interface ChapterMetrics {
	wordsCompleted: number;
	wordsFirstTry: number;
	wordsWithMistakes: number;
	correctPlacements: number;
	wrongPlacements: number;
}

export interface LocaleMetrics extends ChapterMetrics {
	chapters: Record<number, ChapterMetrics>;
}

export interface LocaleProgress {
	clearedThrough: number;
	levelWords: Record<number, number[]>;
	unlocked: Record<string, true>;
	chapterStamps: number[];
	/** Manual hint presses used, keyed `${mode}:${chapter}`. */
	hintUsage: Record<string, number>;
	metrics: LocaleMetrics;
}

export interface VolumeSettings {
	music: number;
	sfx: number;
	voice: number;
}

export interface SaveSettings {
	muted: boolean;
	coachDone: boolean;
	installHintDismissed: boolean;
	mode: GameMode;
	volumes: VolumeSettings;
}

export interface SaveData {
	version: 1;
	settings: SaveSettings;
	locales: Record<Locale, LocaleProgress>;
}

export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'letter-buckets-save';
export const MAX_LEVEL = 50;
export const WORDS_PER_LEVEL = 3;

export const GAME_MODES: GameMode[] = ['easy', 'medium', 'hard'];
export const HINT_BUDGETS: Record<GameMode, number> = {
	easy: Number.POSITIVE_INFINITY,
	medium: 15,
	hard: 5
};

export function emptyChapterMetrics(): ChapterMetrics {
	return {
		wordsCompleted: 0,
		wordsFirstTry: 0,
		wordsWithMistakes: 0,
		correctPlacements: 0,
		wrongPlacements: 0
	};
}

export function emptyMetrics(): LocaleMetrics {
	return { ...emptyChapterMetrics(), chapters: {} };
}

export function defaultLocaleProgress(): LocaleProgress {
	return {
		clearedThrough: 0,
		levelWords: {},
		unlocked: {},
		chapterStamps: [],
		hintUsage: {},
		metrics: emptyMetrics()
	};
}

export function defaultSave(): SaveData {
	return {
		version: 1,
		settings: {
			muted: false,
			coachDone: false,
			installHintDismissed: false,
			mode: 'easy',
			volumes: { music: 1, sfx: 1, voice: 1 }
		},
		locales: Object.fromEntries(
			LOCALES.map((locale) => [locale, defaultLocaleProgress()])
		) as Record<Locale, LocaleProgress>
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function count(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function sanitizeChapterMetrics(value: unknown): ChapterMetrics {
	const metrics = emptyChapterMetrics();
	if (!isPlainObject(value)) return metrics;
	metrics.wordsCompleted = count(value.wordsCompleted);
	// Written data keeps these two in step with `wordsCompleted`; clamp so a
	// hand-edited or corrupt save cannot report more first-try (or mistaken)
	// words than completed ones.
	metrics.wordsFirstTry = Math.min(count(value.wordsFirstTry), metrics.wordsCompleted);
	metrics.wordsWithMistakes = Math.min(
		count(value.wordsWithMistakes),
		metrics.wordsCompleted - metrics.wordsFirstTry
	);
	metrics.correctPlacements = count(value.correctPlacements);
	metrics.wrongPlacements = count(value.wrongPlacements);
	return metrics;
}

function sanitizeMetrics(value: unknown): LocaleMetrics {
	const metrics = emptyMetrics();
	if (!isPlainObject(value)) return metrics;
	const totals = sanitizeChapterMetrics(value);
	Object.assign(metrics, totals);
	if (isPlainObject(value.chapters)) {
		for (const [rawChapter, chapterValue] of Object.entries(value.chapters)) {
			const chapter = Number(rawChapter);
			if (!Number.isInteger(chapter) || chapter < 1 || chapter > 5) continue;
			metrics.chapters[chapter] = sanitizeChapterMetrics(chapterValue);
		}
	}
	return metrics;
}

function sanitizeLocale(value: unknown): LocaleProgress {
	const progress = defaultLocaleProgress();
	if (!isPlainObject(value)) return progress;

	const cleared = value.clearedThrough;
	if (typeof cleared === 'number' && Number.isInteger(cleared)) {
		progress.clearedThrough = clamp(cleared, 0, MAX_LEVEL);
	}

	if (isPlainObject(value.levelWords)) {
		for (const [rawLevel, rawWords] of Object.entries(value.levelWords)) {
			const level = Number(rawLevel);
			if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) continue;
			if (!Array.isArray(rawWords)) continue;
			const words = [
				...new Set(
					rawWords.filter(
						(word): word is number =>
							typeof word === 'number' &&
							Number.isInteger(word) &&
							word >= 0 &&
							word < WORDS_PER_LEVEL
					)
				)
			].sort((a, b) => a - b);
			if (words.length > 0) progress.levelWords[level] = words;
		}
	}

	if (isPlainObject(value.unlocked)) {
		for (const [key, flag] of Object.entries(value.unlocked)) {
			if (flag !== true) continue;
			const match = /^(\d{1,2}):([0-2])$/.exec(key);
			if (!match) continue;
			const level = Number(match[1]);
			if (level < 1 || level > MAX_LEVEL) continue;
			progress.unlocked[key] = true;
		}
	}

	if (Array.isArray(value.chapterStamps)) {
		progress.chapterStamps = [
			...new Set(
				value.chapterStamps.filter(
					(stamp): stamp is number =>
						typeof stamp === 'number' && Number.isInteger(stamp) && stamp >= 1 && stamp <= 5
				)
			)
		].sort((a, b) => a - b);
	}

	if (isPlainObject(value.hintUsage)) {
		for (const [key, used] of Object.entries(value.hintUsage)) {
			if (!/^(easy|medium|hard):[1-5]$/.test(key)) continue;
			progress.hintUsage[key] = count(used);
		}
	}

	progress.metrics = sanitizeMetrics(value.metrics);

	return progress;
}

export function loadSave(storage?: KeyValueStorage | null): SaveData {
	const fallback = defaultSave();
	if (!storage) return fallback;

	let raw: string | null;
	try {
		raw = storage.getItem(SAVE_KEY);
	} catch {
		return fallback;
	}
	if (typeof raw !== 'string' || raw.length === 0) return fallback;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return fallback;
	}
	if (!isPlainObject(parsed) || parsed.version !== 1) return fallback;

	const data = defaultSave();
	if (isPlainObject(parsed.settings)) {
		if (typeof parsed.settings.muted === 'boolean') data.settings.muted = parsed.settings.muted;
		if (typeof parsed.settings.coachDone === 'boolean') {
			data.settings.coachDone = parsed.settings.coachDone;
		}
		if (typeof parsed.settings.installHintDismissed === 'boolean') {
			data.settings.installHintDismissed = parsed.settings.installHintDismissed;
		}
		if (
			parsed.settings.mode === 'easy' ||
			parsed.settings.mode === 'medium' ||
			parsed.settings.mode === 'hard'
		) {
			data.settings.mode = parsed.settings.mode;
		}
		if (isPlainObject(parsed.settings.volumes)) {
			for (const channel of ['music', 'sfx', 'voice'] as const) {
				const value = parsed.settings.volumes[channel];
				if (typeof value === 'number' && Number.isFinite(value)) {
					data.settings.volumes[channel] = clamp(value, 0, 1);
				}
			}
		}
	}
	if (isPlainObject(parsed.locales)) {
		for (const locale of LOCALES) {
			data.locales[locale] = sanitizeLocale(parsed.locales[locale]);
		}
	}
	return data;
}

export function persistSave(data: SaveData, storage: KeyValueStorage): void {
	storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function getLocaleProgress(data: SaveData, locale: Locale): LocaleProgress {
	return data.locales[locale];
}

export function wordKey(level: number, wordIndex: number): string {
	return `${level}:${wordIndex}`;
}

export function currentLevel(data: SaveData, locale: Locale): number {
	return Math.min(MAX_LEVEL, data.locales[locale].clearedThrough + 1);
}

export function isLevelOpen(data: SaveData, locale: Locale, level: number): boolean {
	return (
		Number.isInteger(level) &&
		level >= 1 &&
		level <= MAX_LEVEL &&
		level <= data.locales[locale].clearedThrough + 1
	);
}

export function chapterForLevel(level: number): number {
	return Math.min(5, Math.max(1, Math.ceil(level / 10)));
}

function bumpMetrics(metrics: ChapterMetrics, key: keyof ChapterMetrics, amount = 1): void {
	metrics[key] += amount;
}

export function recordAttempt(
	data: SaveData,
	locale: Locale,
	level: number,
	correct: boolean
): void {
	if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
	const progress = data.locales[locale];
	const chapter = chapterForLevel(level);
	const chapterMetrics = (progress.metrics.chapters[chapter] ??= emptyChapterMetrics());
	const key = correct ? 'correctPlacements' : 'wrongPlacements';
	bumpMetrics(progress.metrics, key);
	bumpMetrics(chapterMetrics, key);
}

export function markWordComplete(
	data: SaveData,
	locale: Locale,
	level: number,
	wordIndex: number,
	firstTry = true
): void {
	if (!isLevelOpen(data, locale, level)) return;
	if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= WORDS_PER_LEVEL) return;

	const progress = data.locales[locale];
	const key = wordKey(level, wordIndex);
	// `unlocked` is the permanent record that a word has ever been finished,
	// while `levelWords` is cleared by "play again". Replaying a finished word
	// must rebuild `levelWords` without inflating the lifetime word totals.
	const firstCompletion = progress.unlocked[key] !== true;

	const words = progress.levelWords[level] ?? [];
	if (!words.includes(wordIndex)) {
		progress.levelWords[level] = [...words, wordIndex].sort((a, b) => a - b);
	}

	if (firstCompletion) {
		const chapter = chapterForLevel(level);
		const chapterMetrics = (progress.metrics.chapters[chapter] ??= emptyChapterMetrics());
		for (const metrics of [progress.metrics, chapterMetrics]) {
			bumpMetrics(metrics, 'wordsCompleted');
			bumpMetrics(metrics, firstTry ? 'wordsFirstTry' : 'wordsWithMistakes');
		}
	}
	progress.unlocked[key] = true;

	if (progress.levelWords[level].length === WORDS_PER_LEVEL) {
		markLevelComplete(data, locale, level);
	}
}

export function hintBudget(mode: GameMode): number {
	return HINT_BUDGETS[mode];
}

export function hintsUsed(data: SaveData, locale: Locale, mode: GameMode, level: number): number {
	if (mode === 'easy') return 0;
	return data.locales[locale].hintUsage[`${mode}:${chapterForLevel(level)}`] ?? 0;
}

export function hintsRemaining(
	data: SaveData,
	locale: Locale,
	mode: GameMode,
	level: number
): number {
	if (mode === 'easy') return Number.POSITIVE_INFINITY;
	return Math.max(0, hintBudget(mode) - hintsUsed(data, locale, mode, level));
}

/** Spend one manual hint. Returns false when the reserve is empty. */
export function spendHint(data: SaveData, locale: Locale, mode: GameMode, level: number): boolean {
	if (mode === 'easy') return true;
	if (hintsRemaining(data, locale, mode, level) <= 0) return false;
	const key = `${mode}:${chapterForLevel(level)}`;
	data.locales[locale].hintUsage[key] = (data.locales[locale].hintUsage[key] ?? 0) + 1;
	return true;
}

export function markLevelComplete(data: SaveData, locale: Locale, level: number): void {
	if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
	const progress = data.locales[locale];
	progress.clearedThrough = Math.max(progress.clearedThrough, level);
	if (level % 10 !== 0) return;
	const stamp = level / 10;
	if (!progress.chapterStamps.includes(stamp)) {
		progress.chapterStamps = [...progress.chapterStamps, stamp].sort((a, b) => a - b);
	}
}

export function resetLevelWords(data: SaveData, locale: Locale, level: number): void {
	if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
	data.locales[locale].levelWords[level] = [];
}

export function resetLocale(data: SaveData, locale: Locale): void {
	data.locales[locale] = defaultLocaleProgress();
}

export function resetHints(data: SaveData, locale: Locale, mode: GameMode, level: number): void {
	delete data.locales[locale].hintUsage[`${mode}:${chapterForLevel(level)}`];
}
