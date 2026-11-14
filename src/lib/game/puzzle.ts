import type { Locale } from '../content/schema.js';
import { gapCountForLevel } from '../content/rules.js';

export interface PuzzleSpec {
	level: number;
	wordIndex: number;
	word: string;
	/** Slot indices that are missing, ascending. */
	gaps: number[];
	/** Extra letters that are not in the word, for the late bands. */
	decoys: string[];
}

export interface Tile {
	id: string;
	letter: string;
	decoy: boolean;
}

export interface PuzzleState {
	spec: PuzzleSpec;
	placed: Record<number, string>;
	remaining: Tile[];
}

export type PlaceOutcome = 'placed' | 'wrong' | 'wrong-word';

export interface PlaceResult {
	state: PuzzleState;
	outcome: PlaceOutcome;
	suggestedSlot?: number;
}

const CONFUSABLES: Record<Locale, Record<string, string[]>> = {
	en: {
		A: ['E', 'O'],
		B: ['D', 'P'],
		C: ['G', 'K'],
		D: ['B', 'T'],
		E: ['A', 'I'],
		F: ['V', 'T'],
		G: ['C', 'J'],
		H: ['N', 'K'],
		I: ['E', 'L'],
		J: ['G', 'I'],
		K: ['C', 'X'],
		L: ['I', 'T'],
		M: ['N', 'W'],
		N: ['M', 'H'],
		O: ['A', 'U'],
		P: ['B', 'Q'],
		Q: ['P', 'O'],
		R: ['N', 'B'],
		S: ['Z', 'C'],
		T: ['D', 'L'],
		U: ['V', 'O'],
		V: ['U', 'F'],
		W: ['M', 'V'],
		X: ['K', 'S'],
		Y: ['V', 'I'],
		Z: ['S', 'X']
	},
	it: {
		A: ['E', 'O'],
		B: ['D', 'P'],
		C: ['G', 'K'],
		D: ['B', 'T'],
		E: ['A', 'I'],
		F: ['V', 'T'],
		G: ['C', 'J'],
		H: ['N', 'K'],
		I: ['E', 'L'],
		L: ['I', 'T'],
		M: ['N', 'W'],
		N: ['M', 'H'],
		O: ['A', 'U'],
		P: ['B', 'Q'],
		Q: ['P', 'O'],
		R: ['N', 'B'],
		S: ['Z', 'C'],
		T: ['D', 'L'],
		U: ['V', 'O'],
		V: ['U', 'F'],
		Z: ['S', 'X']
	},
	de: {
		A: ['Ä', 'E'],
		Ä: ['A', 'E'],
		B: ['D', 'P'],
		C: ['G', 'K'],
		D: ['B', 'T'],
		E: ['A', 'I'],
		F: ['V', 'T'],
		G: ['C', 'J'],
		H: ['N', 'K'],
		I: ['E', 'L'],
		J: ['G', 'I'],
		K: ['C', 'X'],
		L: ['I', 'T'],
		M: ['N', 'W'],
		N: ['M', 'H'],
		O: ['Ö', 'A'],
		Ö: ['O', 'U'],
		P: ['B', 'Q'],
		Q: ['P', 'O'],
		R: ['N', 'B'],
		S: ['Z', 'C'],
		T: ['D', 'L'],
		U: ['Ü', 'V'],
		Ü: ['U', 'V'],
		V: ['U', 'F'],
		W: ['M', 'V'],
		X: ['K', 'S'],
		Y: ['V', 'I'],
		Z: ['S', 'X']
	},
	ro: {
		A: ['Ă', 'E'],
		Ă: ['A', 'Â'],
		Â: ['Ă', 'Î'],
		Î: ['Â', 'I'],
		B: ['D', 'P'],
		C: ['G', 'K'],
		D: ['B', 'T'],
		E: ['A', 'I'],
		F: ['V', 'T'],
		G: ['C', 'J'],
		H: ['N', 'K'],
		I: ['Î', 'E'],
		J: ['G', 'I'],
		K: ['C', 'X'],
		L: ['I', 'T'],
		M: ['N', 'W'],
		N: ['M', 'H'],
		O: ['A', 'U'],
		P: ['B', 'Q'],
		Q: ['P', 'O'],
		R: ['N', 'B'],
		S: ['Ș', 'Z'],
		Ș: ['S', 'Z'],
		T: ['D', 'L'],
		Ț: ['T', 'Z'],
		U: ['V', 'O'],
		V: ['U', 'F'],
		W: ['M', 'V'],
		X: ['K', 'S'],
		Y: ['V', 'I'],
		Z: ['S', 'X']
	},
	ru: {
		А: ['Я', 'О'],
		Б: ['В', 'Ь'],
		В: ['Б', 'Ф'],
		Г: ['Т', 'П'],
		Д: ['Т', 'Л'],
		Е: ['Ё', 'Э'],
		Ё: ['Е', 'О'],
		Ж: ['Ш', 'З'],
		З: ['С', 'Ж'],
		И: ['Й', 'Ы'],
		Й: ['И', 'Н'],
		К: ['Х', 'Ж'],
		Л: ['П', 'Д'],
		М: ['Н', 'Ш'],
		Н: ['М', 'П'],
		О: ['А', 'Ё'],
		П: ['Л', 'Т'],
		Р: ['Ф', 'Ь'],
		С: ['З', 'Ш'],
		Т: ['Г', 'Д'],
		У: ['Ф', 'И'],
		Ф: ['Р', 'В'],
		Х: ['К', 'Ж'],
		Ц: ['Ч', 'Щ'],
		Ч: ['Ц', 'Ш'],
		Ш: ['Щ', 'Ж'],
		Щ: ['Ш', 'Ч'],
		Ъ: ['Ь', 'Ы'],
		Ы: ['И', 'Ъ'],
		Ь: ['Ъ', 'Б'],
		Э: ['Е', 'Ю'],
		Ю: ['Я', 'У'],
		Я: ['А', 'Ю']
	}
};

const ALPHABET: Record<Locale, string> = {
	en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	it: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ',
	ro: 'ABCDEFGHIJKLMNOPQRSTUVWXYZĂÂÎȘȚ',
	ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
};

function hashString(input: string): number {
	let hash = 2166136261;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function chooseGaps(level: number, wordLength: number, random: () => number): number[] {
	const count = Math.min(gapCountForLevel(level), Math.max(0, wordLength - 2));
	if (count === 0) return [];

	// Random but seeded per locale, level, word index, and word, so a word
	// always hides the same slots on replay.
	const positions = Array.from({ length: wordLength }, (_, index) => index);
	return shuffle(positions, random)
		.slice(0, count)
		.sort((a, b) => a - b);
}

function chooseDecoys(word: string, count: number, locale: Locale, random: () => number): string[] {
	if (count === 0) return [];
	const chosen: string[] = [];
	const letters = [...new Set(word)];

	for (const letter of shuffle(letters, random)) {
		const options = shuffle(CONFUSABLES[locale][letter] ?? [], random);
		for (const candidate of options) {
			if (chosen.length >= count) break;
			if (word.includes(candidate) || chosen.includes(candidate)) continue;
			chosen.push(candidate);
		}
		if (chosen.length >= count) break;
	}

	if (chosen.length < count) {
		const fallback = shuffle([...ALPHABET[locale]], random);
		for (const candidate of fallback) {
			if (chosen.length >= count) break;
			if (word.includes(candidate) || chosen.includes(candidate)) continue;
			chosen.push(candidate);
		}
	}

	return chosen.slice(0, count);
}

export function buildPuzzle(input: {
	level: number;
	wordIndex: number;
	word: string;
	locale: Locale;
}): PuzzleSpec {
	const { level, wordIndex, word, locale } = input;
	const random = mulberry32(hashString(`${locale}:${level}:${wordIndex}:${word}`));
	const gaps = chooseGaps(level, word.length, random);
	const decoyCount = level <= 30 ? 0 : level <= 40 ? 1 : 2;
	const decoys = chooseDecoys(word, decoyCount, locale, random);

	return { level, wordIndex, word, gaps, decoys };
}

export function createPuzzleState(spec: PuzzleSpec): PuzzleState {
	const tiles: Tile[] = [
		...spec.gaps.map((slot, index) => ({
			id: `t${index}`,
			letter: spec.word[slot],
			decoy: false
		})),
		...spec.decoys.map((letter, index) => ({
			id: `t${spec.gaps.length + index}`,
			letter,
			decoy: true
		}))
	];
	const random = mulberry32(hashString(`tiles:${spec.level}:${spec.wordIndex}:${spec.word}`));

	return {
		spec,
		placed: {},
		remaining: shuffle(tiles, random)
	};
}

export function placeTile(state: PuzzleState, tileId: string, slot: number): PlaceResult {
	const tile = state.remaining.find((entry) => entry.id === tileId);
	if (!tile || slot in state.placed || !state.spec.gaps.includes(slot)) {
		return { state, outcome: 'wrong' };
	}

	if (tile.letter === state.spec.word[slot]) {
		return {
			state: {
				...state,
				placed: { ...state.placed, [slot]: tile.letter },
				remaining: state.remaining.filter((entry) => entry.id !== tileId)
			},
			outcome: 'placed'
		};
	}

	const suggestedSlot = state.spec.gaps.find(
		(candidate) => !(candidate in state.placed) && state.spec.word[candidate] === tile.letter
	);

	return suggestedSlot === undefined
		? { state, outcome: 'wrong' }
		: { state, outcome: 'wrong-word', suggestedSlot };
}

export function hintTarget(state: PuzzleState): { slot: number; tileId: string } | null {
	const slot = state.spec.gaps.find((candidate) => !(candidate in state.placed));
	if (slot === undefined) return null;
	const tile = state.remaining.find((entry) => entry.letter === state.spec.word[slot]);
	return tile ? { slot, tileId: tile.id } : null;
}

export function isComplete(state: PuzzleState): boolean {
	return state.spec.gaps.every((slot) => slot in state.placed);
}
