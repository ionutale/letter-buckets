import type { Locale } from '../content/schema.js';
import { LOCALES } from '../content/schema.js';

export interface LocaleProgress {
	clearedThrough: number;
	levelWords: Record<number, number[]>;
	unlocked: Record<string, true>;
	chapterStamps: number[];
}

export interface SaveSettings {
	muted: boolean;
	coachDone: boolean;
	installHintDismissed: boolean;
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

export function defaultLocaleProgress(): LocaleProgress {
	return {
		clearedThrough: 0,
		levelWords: {},
		unlocked: {},
		chapterStamps: []
	};
}

export function defaultSave(): SaveData {
	return {
		version: 1,
		settings: { muted: false, coachDone: false, installHintDismissed: false },
		locales: Object.fromEntries(LOCALES.map((locale) => [locale, defaultLocaleProgress()])) as Record<
			Locale,
			LocaleProgress
		>
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
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

export function markWordComplete(
	data: SaveData,
	locale: Locale,
	level: number,
	wordIndex: number
): void {
	if (!isLevelOpen(data, locale, level)) return;
	if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= WORDS_PER_LEVEL) return;

	const progress = data.locales[locale];
	const words = progress.levelWords[level] ?? [];
	if (!words.includes(wordIndex)) {
		progress.levelWords[level] = [...words, wordIndex].sort((a, b) => a - b);
	}
	progress.unlocked[wordKey(level, wordIndex)] = true;

	if (progress.levelWords[level].length === WORDS_PER_LEVEL) {
		markLevelComplete(data, locale, level);
	}
}

export function markLevelComplete(data: SaveData, locale: Locale, level: number): void {
	if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
	const progress = data.locales[locale];
	progress.clearedThrough = Math.max(progress.clearedThrough, level);
	const stamp = Math.ceil(level / 10);
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
