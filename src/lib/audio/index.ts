export type SfxName =
	| 'tile-pick'
	| 'tile-place'
	| 'tile-wrong'
	| 'ui-tap'
	| 'bucket-open'
	| 'word-complete'
	| 'level-complete'
	| 'coin';

export interface AudioController {
	readonly muted: boolean;
	unlock(): void;
	setMuted(muted: boolean): void;
	playWord(locale: string, level: number, index: number): void;
	preloadLevel(locale: string, level: number): void;
	playSfx(name: SfxName): void;
	playMusic(): void;
	stopWord(): void;
}

export interface AudioOptions {
	createAudio?: () => HTMLAudioElement;
}

export function wordAudioPath(locale: string, level: number, index: number): string {
	return `/audio/words/${locale}/l${String(level).padStart(2, '0')}-w${index + 1}.mp3`;
}

export function createAudioController(options: AudioOptions = {}): AudioController {
	const MUSIC_VOLUME = 0.16;
	const DUCKED_VOLUME = 0.04;
	const make = options.createAudio ?? (() => new Audio());
	let unlocked = false;
	let muted = false;
	let word: HTMLAudioElement | null = null;
	let sfx: HTMLAudioElement | null = null;
	let music: HTMLAudioElement | null = null;
	let duckTimer: number | null = null;
	const preloads = new Map<string, HTMLAudioElement>();

	function playQuietly(audio: HTMLAudioElement): void {
		void audio.play().catch(() => {
			// Autoplay blocked, offline or a missing clip: the game stays silent.
		});
	}

	function unlock(): void {
		if (unlocked) return;
		unlocked = true;
		if (!muted) playMusic();
	}

	function restoreMusic(): void {
		if (duckTimer !== null && typeof window !== 'undefined') {
			window.clearTimeout(duckTimer);
			duckTimer = null;
		}
		if (music && !muted) music.volume = MUSIC_VOLUME;
	}

	function duckMusic(): void {
		if (!music || muted) return;
		music.volume = DUCKED_VOLUME;
		if (typeof window === 'undefined') return;
		if (duckTimer !== null) window.clearTimeout(duckTimer);
		duckTimer = window.setTimeout(() => {
			duckTimer = null;
			if (music && !muted) music.volume = MUSIC_VOLUME;
		}, 1200);
	}

	function stopSfx(): void {
		sfx?.pause();
		sfx = null;
	}

	function setMuted(next: boolean): void {
		muted = next;
		if (muted) {
			stopWord();
			stopSfx();
			music?.pause();
			restoreMusic();
			return;
		}
		if (unlocked) playMusic();
	}

	function stopWord(): void {
		word?.pause();
		word = null;
		restoreMusic();
	}

	function playWord(locale: string, level: number, index: number): void {
		if (muted) return;
		stopSfx();
		stopWord();
		duckMusic();
		const audio = make();
		audio.src = wordAudioPath(locale, level, index);
		audio.volume = 0.9;
		word = audio;
		playQuietly(audio);
	}

	function preloadLevel(locale: string, level: number): void {
		for (let index = 0; index < 3; index++) {
			const path = wordAudioPath(locale, level, index);
			if (preloads.has(path)) continue;
			const audio = make();
			audio.preload = 'auto';
			audio.volume = 0;
			audio.src = path;
			preloads.set(path, audio);
		}
	}

	function playSfx(name: SfxName): void {
		if (muted) return;
		stopSfx();
		duckMusic();
		const audio = make();
		audio.src = `/audio/sfx/${name}.mp3`;
		audio.volume = 0.55;
		sfx = audio;
		audio.addEventListener('ended', restoreMusic);
		playQuietly(audio);
	}

	function playMusic(): void {
		if (muted) return;
		if (!music) {
			music = make();
			music.src = '/audio/music/loop.mp3';
			music.loop = true;
			music.volume = MUSIC_VOLUME;
		}
		if (music.paused) playQuietly(music);
	}

	return {
		get muted() {
			return muted;
		},
		unlock,
		setMuted,
		playWord,
		preloadLevel,
		playSfx,
		playMusic,
		stopWord
	};
}

export const audio = createAudioController();
