export type SfxName =
	| 'tile-pick'
	| 'tile-place'
	| 'tile-wrong'
	| 'ui-tap'
	| 'bucket-open'
	| 'word-complete'
	| 'level-complete'
	| 'coin';

export type VolumeChannel = 'music' | 'sfx' | 'voice';

export interface AudioVolumes {
	music: number;
	sfx: number;
	voice: number;
}

export interface AudioController {
	readonly muted: boolean;
	readonly volumes: AudioVolumes;
	unlock(): void;
	setMuted(muted: boolean): void;
	setVolume(channel: VolumeChannel, value: number): void;
	setVolumes(volumes: Partial<AudioVolumes>): void;
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
	let volumes: AudioVolumes = { music: 1, sfx: 1, voice: 1 };
	let word: HTMLAudioElement | null = null;
	let sfx: HTMLAudioElement | null = null;
	let music: HTMLAudioElement | null = null;
	let duckTimer: number | null = null;
	let resumeMusicWhenVisible = false;
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

	function clampVolume(value: number): number {
		if (!Number.isFinite(value)) return 1;
		return Math.min(1, Math.max(0, value));
	}

	function syncMusicVolume(): void {
		if (music && !muted) {
			music.volume = (duckTimer === null ? MUSIC_VOLUME : DUCKED_VOLUME) * volumes.music;
		}
	}

	function restoreMusic(): void {
		if (duckTimer !== null && typeof window !== 'undefined') {
			window.clearTimeout(duckTimer);
			duckTimer = null;
		}
		syncMusicVolume();
	}

	function duckMusic(): void {
		if (!music || muted) return;
		music.volume = DUCKED_VOLUME * volumes.music;
		if (typeof window === 'undefined') return;
		if (duckTimer !== null) window.clearTimeout(duckTimer);
		duckTimer = window.setTimeout(() => {
			duckTimer = null;
			syncMusicVolume();
		}, 1200);
	}

	function stopSfx(): void {
		sfx?.pause();
		sfx = null;
	}

	function suspend(): void {
		resumeMusicWhenVisible = Boolean(music && !music.paused && !muted);
		if (duckTimer !== null && typeof window !== 'undefined') {
			window.clearTimeout(duckTimer);
			duckTimer = null;
		}
		stopWord();
		stopSfx();
		music?.pause();
	}

	function resume(): void {
		if (document.visibilityState === 'hidden' || muted) return;
		if (!resumeMusicWhenVisible) return;
		resumeMusicWhenVisible = false;
		playMusic();
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') suspend();
		else resume();
	}

	function setMuted(next: boolean): void {
		muted = next;
		if (muted) {
			resumeMusicWhenVisible = false;
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
		audio.volume = 0.9 * volumes.voice;
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
		audio.volume = 0.55 * volumes.sfx;
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
			music.volume = MUSIC_VOLUME * volumes.music;
		}
		if (music.paused) playQuietly(music);
	}

	function setVolume(channel: VolumeChannel, value: number): void {
		volumes = { ...volumes, [channel]: clampVolume(value) };
		if (channel === 'music') syncMusicVolume();
	}

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('pagehide', suspend);
		window.addEventListener('pageshow', resume);
	}

	function setVolumes(next: Partial<AudioVolumes>): void {
		volumes = {
			music: clampVolume(next.music ?? volumes.music),
			sfx: clampVolume(next.sfx ?? volumes.sfx),
			voice: clampVolume(next.voice ?? volumes.voice)
		};
		syncMusicVolume();
	}

	return {
		get muted() {
			return muted;
		},
		get volumes() {
			return volumes;
		},
		unlock,
		setMuted,
		setVolume,
		setVolumes,
		playWord,
		preloadLevel,
		playSfx,
		playMusic,
		stopWord
	};
}

export const audio = createAudioController();
