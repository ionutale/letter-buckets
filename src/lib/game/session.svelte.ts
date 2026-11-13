import { getLevelContent } from '../content/index.js';
import type { LevelContent, Locale } from '../content/schema.js';
import type { LocaleProgress } from '../storage/save.js';
import {
	buildPuzzle,
	createPuzzleState,
	hintTarget,
	isComplete,
	placeTile,
	type PlaceResult,
	type PuzzleState
} from './puzzle.js';

export interface BucketState {
	index: 0 | 1 | 2;
	status: 'closed' | 'open' | 'done';
	word?: string;
}

export interface LevelSessionOptions {
	progress?: LocaleProgress;
	onWordComplete?: (level: number, wordIndex: number) => void;
	onLevelComplete?: (level: number) => void;
}

export interface LevelSession {
	readonly level: number;
	readonly locale: Locale;
	readonly content: LevelContent;
	readonly buckets: BucketState[];
	readonly openIndex: number | null;
	readonly word: PuzzleState | null;
	readonly complete: boolean;
	readonly hintStep: 0 | 1 | 2 | 3;
	openBucket(index: number): void;
	closeWord(): void;
	place(tileId: string, slot: number): PlaceResult;
	hint(): void;
	noteInteraction(): void;
	reset(): void;
}

export function createLevelSession(
	level: number,
	locale: Locale,
	options: LevelSessionOptions = {}
): LevelSession {
	const content = getLevelContent(locale, level);
	const completed = new Set(options.progress?.levelWords[level] ?? []);
	const notified = new Set<number>(completed);

	let buckets = $state<BucketState[]>(
		([0, 1, 2] as const).map((index) => ({
			index,
			status: completed.has(index) ? 'done' : 'closed',
			word: completed.has(index) ? content.words[index].word : undefined
		}))
	);
	let openIndex = $state<number | null>(null);
	let word = $state<PuzzleState | null>(null);
	let complete = $state(false);
	let hintStep = $state<0 | 1 | 2 | 3>(0);

	function openBucket(index: number): void {
		if (!Number.isInteger(index) || index < 0 || index > 2) return;
		openIndex = index;
		hintStep = 0;

		const entry = content.words[index];
		const spec = buildPuzzle({ level, wordIndex: index, word: entry.word, locale });

		if (buckets[index].status === 'done') {
			word = {
				spec,
				placed: Object.fromEntries(spec.gaps.map((slot) => [slot, spec.word[slot]])),
				remaining: []
			};
			return;
		}

		buckets[index].status = 'open';
		word = createPuzzleState(spec);
	}

	function closeWord(): void {
		openIndex = null;
		word = null;
		hintStep = 0;
	}

	function place(tileId: string, slot: number): PlaceResult {
		if (!word || openIndex === null) {
			return { state: word as PuzzleState, outcome: 'wrong' };
		}

		const result = placeTile(word, tileId, slot);
		word = result.state;
		hintStep = 0;

		if (result.outcome === 'placed' && isComplete(word)) {
			const index = openIndex;
			buckets[index].status = 'done';
			buckets[index].word = content.words[index].word;

			if (!notified.has(index)) {
				notified.add(index);
				options.onWordComplete?.(level, index);
			}

			if (buckets.every((bucket) => bucket.status === 'done')) {
				complete = true;
				options.onLevelComplete?.(level);
			}
		}

		return result;
	}

	function hint(): void {
		if (!word) return;
		if (hintStep < 2) hintStep = (hintStep + 1) as 0 | 1 | 2 | 3;
		else hintStep = 3;
	}

	function noteInteraction(): void {
		hintStep = 0;
	}

	function reset(): void {
		buckets = ([0, 1, 2] as const).map((index) => ({
			index,
			status: 'closed',
			word: undefined
		}));
		openIndex = null;
		word = null;
		complete = false;
		hintStep = 0;
		notified.clear();
	}

	return {
		get level() {
			return level;
		},
		get locale() {
			return locale;
		},
		get content() {
			return content;
		},
		get buckets() {
			return buckets;
		},
		get openIndex() {
			return openIndex;
		},
		get word() {
			return word;
		},
		get complete() {
			return complete;
		},
		get hintStep() {
			return hintStep;
		},
		openBucket,
		closeWord,
		place,
		hint,
		noteInteraction,
		reset
	};
}

export { hintTarget };
