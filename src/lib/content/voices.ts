import type { Locale } from './schema.js';

export interface VoiceOption {
	/** App-level id, used in save data and audio paths. */
	id: string;
	/** Voice id in the `music-sfx-voice-studio` library. */
	studioId: string;
	/** Proper name, shown as-is in every language. */
	label: string;
}

/**
 * The Italian narrators. `narratrice` is the default and keeps the original
 * unsegmented audio paths; the others live in a folder of their own.
 */
export const ITALIAN_VOICES: readonly VoiceOption[] = [
	{ id: 'narratrice', studioId: 'narratrice-a', label: 'Narratrice' },
	{ id: 'chiara', studioId: 'it-maestra-chiara', label: 'Maestra Chiara' },
	{ id: 'marco', studioId: 'it-narratore-marco', label: 'Marco' },
	{ id: 'lucia', studioId: 'it-nonna-lucia', label: 'Nonna Lucia' },
	{ id: 'giovane', studioId: 'it-voce-giovane', label: 'Giovane' }
];

export const DEFAULT_VOICE = 'narratrice';

/** Voices a player can pick for a language. Only Italian has more than one. */
export function voicesFor(locale: Locale): readonly VoiceOption[] {
	return locale === 'it' ? ITALIAN_VOICES : [];
}

/** Falls back to the default when the stored id is unknown or not offered. */
export function resolveVoice(locale: Locale, id: string | undefined): string {
	const voices = voicesFor(locale);
	if (voices.length === 0) return DEFAULT_VOICE;
	return voices.some((voice) => voice.id === id) ? (id as string) : DEFAULT_VOICE;
}

/** Path segment for a voice, empty for the default so its clips never move. */
export function voiceSegment(locale: Locale, voice: string): string {
	return locale === 'it' && voice !== DEFAULT_VOICE ? `${voice}/` : '';
}
