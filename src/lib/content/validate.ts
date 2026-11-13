import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LevelContent, Locale, LocaleContent } from './schema.js';
import { LOCALES } from './schema.js';
import { gapCountForLevel, isAllowedWord, MAX_WORD_LENGTH, MIN_WORD_LENGTH } from './rules.js';

export interface ContentIssue {
	locale: Locale;
	level?: number;
	word?: string;
	message: string;
}

const PROJECT_ROOT = new URL('../../../', import.meta.url);

function assetPath(relative: string): string {
	return fileURLToPath(new URL(`static/${relative}`, PROJECT_ROOT));
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Validate one or more locale content sets. `requireAssets` turns on the
 * release check that every word clip and level illustration exists on disk.
 */
export function validateContent(
	content: Partial<Record<Locale, LocaleContent>>,
	options: { requireAssets?: boolean } = {}
): ContentIssue[] {
	const issues: ContentIssue[] = [];

	for (const locale of LOCALES) {
		const data = content[locale];
		if (!data) {
			issues.push({ locale, message: 'missing locale content' });
			continue;
		}
		if (data.locale !== locale) {
			issues.push({ locale, message: `locale field is "${data.locale}"` });
		}
		if (data.levels.length !== 50) {
			issues.push({ locale, message: `expected 50 levels, found ${data.levels.length}` });
		}

		const seenIds = new Set<number>();
		for (const [index, level] of data.levels.entries()) {
			const expectedId = index + 1;
			if (level.id !== expectedId) {
				issues.push({
					locale,
					level: level.id,
					message: `level at index ${index} has id ${level.id}, expected ${expectedId}`
				});
			}
			if (seenIds.has(level.id)) {
				issues.push({ locale, level: level.id, message: 'duplicate level id' });
			}
			seenIds.add(level.id);

			if (!level.theme.trim()) {
				issues.push({ locale, level: level.id, message: 'empty theme' });
			}
			if (level.words.length !== 3) {
				issues.push({
					locale,
					level: level.id,
					message: `expected 3 words, found ${level.words.length}`
				});
			}

			const seenWords = new Set<string>();
			for (const [wordIndex, entry] of level.words.entries()) {
				const word = entry.word;
				if (seenWords.has(word)) {
					issues.push({ locale, level: level.id, word, message: 'duplicate word in level' });
				}
				seenWords.add(word);

				if (locale === 'de' && word.includes('ß')) {
					issues.push({
						locale,
						level: level.id,
						word,
						message: 'German words may not contain ß'
					});
					continue;
				}

				if (!isAllowedWord(locale, word)) {
					issues.push({
						locale,
						level: level.id,
						word,
						message: `not a legal ${locale} word (length ${word.length}, expected ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH} uppercase letters)`
					});
					continue;
				}

				const gaps = gapCountForLevel(level.id, word.length);
				if (gaps < 1 || gaps > word.length - 2) {
					issues.push({
						locale,
						level: level.id,
						word,
						message: `gap count ${gaps} leaves fewer than two revealed letters`
					});
				}

				if (options.requireAssets) {
					const clip = assetPath(`audio/words/${locale}/l${pad(level.id)}-w${wordIndex + 1}.mp3`);
					if (!existsSync(clip)) {
						issues.push({
							locale,
							level: level.id,
							word,
							message: `missing audio clip ${clip}`
						});
					}
				}
			}

			if (options.requireAssets) {
				const art = assetPath(`art/levels/l${pad(level.id)}.webp`);
				if (!existsSync(art)) {
					issues.push({ locale, level: level.id, message: `missing illustration ${art}` });
				}
			}
		}
	}

	return issues;
}

/** Convenience for tests and the release check. */
export function assertValidContent(
	content: Partial<Record<Locale, LocaleContent>>,
	options: { requireAssets?: boolean } = {}
): void {
	const issues = validateContent(content, options);
	if (issues.length > 0) {
		const summary = issues.slice(0, 10).map((issue) => `${issue.locale}: ${issue.message}`);
		throw new Error(`${issues.length} content issue(s):\n${summary.join('\n')}`);
	}
}

export type { LevelContent };
