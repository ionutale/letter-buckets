import type { Locale } from './schema.js';

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 6;

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
 * The single source of truth for how many letters a level hides.
 * Words shorter than five letters stay at two gaps so at least two letters
 * remain visible as a scaffold for the youngest players.
 */
export function gapCountForLevel(level: number, wordLength: number): number {
	const band = level <= 20 ? 1 : level <= 40 ? 2 : wordLength >= 5 ? 3 : 2;
	return Math.min(band, Math.max(0, wordLength - 2), 3);
}
