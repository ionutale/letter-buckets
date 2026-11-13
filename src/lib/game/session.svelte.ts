import { getLevelContent } from '../content/index.js';
import type { LevelContent, Locale } from '../content/schema.js';
import type { LocaleProgress } from '../storage/save.js';
import { nextHintAction, type HintAction } from './hints.js';
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
	readonly lastHint: HintAction | null;
	openBucket(index: number): void;
	closeWord(): void;
	place(tileId: string, slot: number): PlaceResult;
	hint(): void;
	noteInteraction(): void;
	pauseHints(): void;
	resumeHints(): void;
	reset(): void;
}

const HINT_MS = 10_000;

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
	let lastHint = $state<HintAction | null>(null);
	let hintsPaused = false;
	let hintTimer: number | null = null;

	function clearHintTimer(): void {
		if (hintTimer !== null) {
			clearTimeout(hintTimer);
			hintTimer = null;
		}
	}

	function armHintTimer(): void {
		clearHintTimer();
		if (hintsPaused || !word || openIndex === null || hintStep === 3) return;
		if (typeof window === 'undefined') return;
		hintTimer = window.setTimeout(() => {
			hintTimer = null;
			advanceHint();
		}, HINT_MS);
	}

	function advanceHint(): void {
		if (!word || openIndex === null) return;
		const action = nextHintAction(word, hintStep);
		lastHint = action;

		if (action.kind === 'pulse-slot') {
			hintStep = 1;
			armHintTimer();
			return;
		}

		if (action.kind === 'pulse-tile') {
			hintStep = 2;
			armHintTimer();
			return;
		}

		if (action.kind === 'auto-place') {
			hintStep = 3;
			clearHintTimer();
			place(action.tileId, action.slot);
			// `place` resets the hint cycle for a real interaction; an automatic
			// placement must stay locked until the child touches something.
			hintStep = 3;
			lastHint = action;
			clearHintTimer();
			return;
		}

		hintStep = 3;
		clearHintTimer();
	}

	function openBucket(index: number): void {
		if (!Number.isInteger(index) || index < 0 || index > 2) return;
		openIndex = index;
		hintStep = 0;
		lastHint = null;

		const entry = content.words[index];
		const spec = buildPuzzle({ level, wordIndex: index, word: entry.word, locale });

		if (buckets[index].status === 'done') {
			word = {
				spec,
				placed: Object.fromEntries(spec.gaps.map((slot) => [slot, spec.word[slot]])),
				remaining: []
			};
			clearHintTimer();
			return;
		}

		buckets[index].status = 'open';
		word = createPuzzleState(spec);
		armHintTimer();
	}

	function closeWord(): void {
		clearHintTimer();
		openIndex = null;
		word = null;
		hintStep = 0;
		lastHint = null;
	}

	function place(tileId: string, slot: number): PlaceResult {
		if (!word || openIndex === null) {
			return { state: word as PuzzleState, outcome: 'wrong' };
		}

		const result = placeTile(word, tileId, slot);
		word = result.state;
		hintStep = 0;
		lastHint = null;
		armHintTimer();

		if (result.outcome === 'placed' && isComplete(word)) {
			const index = openIndex;
			clearHintTimer();
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
		// A deliberate press is an interaction: it reopens the chain after an
		// automatic placement, while an idle tablet still cannot chain.
		if (hintStep === 3) {
			hintStep = 0;
			lastHint = null;
		}
		advanceHint();
	}

	function noteInteraction(): void {
		hintStep = 0;
		lastHint = null;
		armHintTimer();
	}

	function pauseHints(): void {
		hintsPaused = true;
		clearHintTimer();
	}

	function resumeHints(): void {
		hintsPaused = false;
		armHintTimer();
	}

	function reset(): void {
		clearHintTimer();
		buckets = ([0, 1, 2] as const).map((index) => ({
			index,
			status: 'closed',
			word: undefined
		}));
		openIndex = null;
		word = null;
		complete = false;
		hintStep = 0;
		lastHint = null;
		hintsPaused = false;
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
		get lastHint() {
			return lastHint;
		},
		openBucket,
		closeWord,
		place,
		hint,
		noteInteraction,
		pauseHints,
		resumeHints,
		reset
	};
}

export { hintTarget };
