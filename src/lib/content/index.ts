import type { LevelContent, Locale, LocaleContent, PackageId } from './schema.js';
import { de } from './levels.de.js';
import { en } from './levels.en.js';
import { it } from './levels.it.js';
import { ro } from './levels.ro.js';
import { ru } from './levels.ru.js';
import { enP3 } from './levels.en.p3.js';
import { itP3 } from './levels.it.p3.js';
import { roP3 } from './levels.ro.p3.js';
import { deP3 } from './levels.de.p3.js';
import { ruP3 } from './levels.ru.p3.js';
import { enP2 } from './levels.en.p2.js';
import { itP2 } from './levels.it.p2.js';
import { roP2 } from './levels.ro.p2.js';
import { deP2 } from './levels.de.p2.js';
import { ruP2 } from './levels.ru.p2.js';

export const LEVEL_COUNT = 50;

export const CONTENT: Record<Locale, LocaleContent> = { ro, it, en, de, ru };

export const PACKAGE_2: Record<Locale, LocaleContent> = {
	ro: roP2,
	it: itP2,
	en: enP2,
	de: deP2,
	ru: ruP2
};

export const PACKAGE_3: Record<Locale, LocaleContent> = {
	ro: roP3,
	it: itP3,
	en: enP3,
	de: deP3,
	ru: ruP3
};

export function getPackageContent(locale: Locale, packageId: PackageId = 'p1'): LocaleContent {
	if (packageId === 'p3') return PACKAGE_3[locale];
	if (packageId === 'p2') return PACKAGE_2[locale];
	return CONTENT[locale];
}

export function getLevelContent(
	locale: Locale,
	level: number,
	packageId: PackageId = 'p1'
): LevelContent {
	const entry = getPackageContent(locale, packageId).levels[level - 1];
	if (!entry) throw new Error(`No level ${level} for locale ${locale} (${packageId})`);
	return entry;
}

export function getLevelArt(level: number, packageId: PackageId = 'p1'): string {
	const folder =
		packageId === 'p3' ? '/art/p3/levels' : packageId === 'p2' ? '/art/p2/levels' : '/art/levels';
	return `${folder}/l${String(level).padStart(2, '0')}.webp`;
}

export function getWordArt(
	locale: Locale,
	level: number,
	index: number,
	packageId: PackageId = 'p1'
): string {
	const folder =
		packageId === 'p3' ? '/art/p3/words' : packageId === 'p2' ? '/art/p2/words' : '/art/words';
	return `${folder}/${locale}/l${String(level).padStart(2, '0')}-w${index + 1}.webp`;
}

export * from './schema.js';
