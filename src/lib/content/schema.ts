export type Locale = 'ro' | 'it' | 'en' | 'de' | 'ru';
export type PackageId = 'p1' | 'p2' | 'p3';

export interface WordEntry {
	/** Display and puzzle form, uppercase, letters only. */
	word: string;
	/** Optional TTS override when the written form is pronounced differently. */
	spoken?: string;
}

export interface LevelContent {
	id: number;
	/** Localized theme label, e.g. "Pets". */
	theme: string;
	words: [WordEntry, WordEntry, WordEntry];
}

export interface LocaleContent {
	locale: Locale;
	packageId?: PackageId;
	levels: LevelContent[];
}

export const LOCALES: readonly Locale[] = ['ro', 'it', 'en', 'de', 'ru'];

/** Compact authoring helper: exactly three words per level, in order. */
export function level(id: number, theme: string, a: string, b: string, c: string): LevelContent {
	return { id, theme, words: [{ word: a }, { word: b }, { word: c }] };
}
