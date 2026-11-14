import type { Locale } from './schema.js';

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 8;

/**
 * Uppercase alphabets accepted for each locale. Italian is deliberately
 * accent-free and German deliberately has no ß, because the game renders
 * uppercase single tiles and `ß` would become `SS`.
 */
export const ALPHABETS: Record<Locale, RegExp> = {
	en: /^[A-Z]+$/,
	it: /^[A-Z]+$/,
	de: /^[A-ZÄÖÜ]+$/,
	ro: /^[A-ZĂÂÎȘȚ]+$/,
	ru: /^[А-ЯЁ]+$/
};

const FORBIDDEN: Record<Locale, readonly RegExp[]> = {
	en: [],
	it: [/[ÀÈÉÌÒÙÁÍÓÚ]/],
	de: [/ß/],
	ro: [],
	ru: []
};

/** True when `word` is a legal uppercase puzzle word for the locale. */
export function isAllowedWord(locale: Locale, word: string): boolean {
	if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) return false;
	if (word !== word.toUpperCase()) return false;
	if (!ALPHABETS[locale].test(word)) return false;
	return !FORBIDDEN[locale].some((pattern) => pattern.test(word));
}

/**
 * The single source of truth for how many letters a level hides. Every
 * chapter of ten levels repeats the same ramp: 1, 1, 1, 1, 2, 2, 2, 3, 3, 4.
 */
export function gapCountForLevel(level: number): number {
	const position = ((level - 1) % 10) + 1;
	if (position <= 4) return 1;
	if (position <= 7) return 2;
	if (position <= 9) return 3;
	return 4;
}

/**
 * The shortest word that still shows two revealed letters at this level.
 * A word must be at least gaps + 2 letters long.
 */
export function minWordLengthForLevel(level: number): number {
	return gapCountForLevel(level) + 2;
}
