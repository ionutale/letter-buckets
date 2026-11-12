import type { LevelContent, Locale, LocaleContent } from './schema.js';
import { de } from './levels.de.js';
import { en } from './levels.en.js';
import { it } from './levels.it.js';
import { ro } from './levels.ro.js';
import { ru } from './levels.ru.js';

export const LEVEL_COUNT = 50;

export const CONTENT: Record<Locale, LocaleContent> = { ro, it, en, de, ru };

export function getLevelContent(locale: Locale, level: number): LevelContent {
	const entry = CONTENT[locale].levels[level - 1];
	if (!entry) throw new Error(`No level ${level} for locale ${locale}`);
	return entry;
}

export function getLevelArt(level: number): string {
	return `/art/levels/l${String(level).padStart(2, '0')}.webp`;
}

export * from './schema.js';
export { validateContent } from './validate.js';
