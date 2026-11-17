export type SfxName =
	| 'tile-pick'
	| 'tile-place'
	| 'tile-wrong'
	| 'ui-tap'
	| 'bucket-open'
	| 'word-complete'
	| 'level-complete'
	| 'coin';

import type { Locale, PackageId } from '../content/schema.js';
import { DEFAULT_VOICE, voiceSegment } from '../content/voices.js';

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
	playWord(
		locale: string,
		level: number,
		index: number,
		packageId?: PackageId,
		voice?: string
	): void;
	preloadLevel(locale: string, level: number, packageId?: PackageId, voice?: string): void;
	playSfx(name: SfxName): void;
	playMusic(): void;
	stopWord(): void;
}

export interface AudioOptions {
	createAudio?: () => HTMLAudioElement;
}

export function wordAudioPath(
	locale: string,
	level: number,
	index: number,
	packageId: PackageId = 'p1',
	voice: string = DEFAULT_VOICE
): string {
	const folder =
		packageId === 'p3'
			? '/audio/p3/words'
			: packageId === 'p2'
				? '/audio/p2/words'
				: '/audio/words';
	const segment = voiceSegment(locale as Locale, voice);
	return `${folder}/${locale}/${segment}l${String(level).padStart(2, '0')}-w${index + 1}.mp3`;
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
	let context: AudioContext | null = null;
	let gains: Record<VolumeChannel, GainNode> | null = null;
	const sources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
	const preloads = new Map<string, HTMLAudioElement>();

	function playQuietly(audio: HTMLAudioElement): void {
		void audio.play().catch(() => {
			// Autoplay blocked, offline or a missing clip: the game stays silent.
		});
	}

	function ensureGraph(): boolean {
		if (context && gains) return true;
		if (typeof window === 'undefined') return false;
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return false;
		try {
			context = new Ctor();
			gains = {
				music: context.createGain(),
				sfx: context.createGain(),
				voice: context.createGain()
			};
			for (const gain of Object.values(gains)) gain.connect(context.destination);
			applyGain('music');
			applyGain('sfx');
			applyGain('voice');
			return true;
		} catch {
			context = null;
			gains = null;
			return false;
		}
	}

	function resumeContext(): void {
		if (context?.state === 'suspended') void context.resume().catch(() => undefined);
	}

	function connectElement(audio: HTMLAudioElement, channel: VolumeChannel): boolean {
		if (!ensureGraph() || !context || !gains) return false;
		resumeContext();
		if (sources.has(audio)) return true;
		try {
			const source = context.createMediaElementSource(audio);
			source.connect(gains[channel]);
			sources.set(audio, source);
			return true;
		} catch {
			return false;
		}
	}

	function targetGain(channel: VolumeChannel): number {
		if (muted) return 0;
		if (channel === 'music') {
			return (duckTimer === null ? MUSIC_VOLUME : DUCKED_VOLUME) * volumes.music;
		}
		if (channel === 'sfx') return 0.55 * volumes.sfx;
		return 0.9 * volumes.voice;
	}

	function applyGain(channel: VolumeChannel): void {
		if (!gains || !context) return;
		const gain = gains[channel];
		const target = targetGain(channel);
		gain.gain.cancelScheduledValues(context.currentTime);
		gain.gain.setTargetAtTime(target, context.currentTime, 0.04);
	}

	function unlock(): void {
		if (unlocked) return;
		unlocked = true;
		ensureGraph();
		resumeContext();
		if (!muted) playMusic();
	}

	function clampVolume(value: number): number {
		if (!Number.isFinite(value)) return 1;
		return Math.min(1, Math.max(0, value));
	}

	function syncMusicVolume(): void {
		applyGain('music');
		if (music && !gains && !muted) {
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

	function duckMusic(holdForVoice = false): void {
		if (!music || muted) return;
		if (!gains) music.volume = DUCKED_VOLUME * volumes.music;
		if (typeof window !== 'undefined') {
			if (duckTimer !== null) window.clearTimeout(duckTimer);
			// A word clip can run for several seconds. Hold the duck until the clip
			// ends (with a fallback) instead of restoring under the voice.
			duckTimer = window.setTimeout(
				() => {
					duckTimer = null;
					syncMusicVolume();
				},
				holdForVoice ? 6000 : 1200
			);
		}
		if (gains) applyGain('music');
	}

	function stopSfx(): void {
		sfx?.pause();
		sfx = null;
	}

	function suspend(): void {
		resumeMusicWhenVisible = resumeMusicWhenVisible || Boolean(music && !music.paused && !muted);
		if (duckTimer !== null && typeof window !== 'undefined') {
			window.clearTimeout(duckTimer);
			duckTimer = null;
		}
		stopWord();
		stopSfx();
		music?.pause();
		void context?.suspend().catch(() => undefined);
	}

	function resume(): void {
		if (document.visibilityState === 'hidden' || muted) return;
		resumeContext();
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
			void context?.suspend().catch(() => undefined);
			return;
		}
		resumeContext();
		applyGain('music');
		applyGain('sfx');
		applyGain('voice');
		if (unlocked) playMusic();
	}

	function stopWord(): void {
		word?.pause();
		word = null;
		restoreMusic();
	}

	function playWord(
		locale: string,
		level: number,
		index: number,
		packageId: PackageId = 'p1',
		voice: string = DEFAULT_VOICE
	): void {
		if (muted) return;
		stopSfx();
		stopWord();
		duckMusic(true);
		const audio = make();
		audio.src = wordAudioPath(locale, level, index, packageId, voice);
		const routed = connectElement(audio, 'voice');
		audio.volume = routed ? 1 : 0.9 * volumes.voice;
		audio.addEventListener('ended', restoreMusic, { once: true });
		audio.addEventListener('error', restoreMusic, { once: true });
		word = audio;
		playQuietly(audio);
	}

	function preloadLevel(
		locale: string,
		level: number,
		packageId: PackageId = 'p1',
		voice: string = DEFAULT_VOICE
	): void {
		for (let index = 0; index < 3; index++) {
			const path = wordAudioPath(locale, level, index, packageId, voice);
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
		const routed = connectElement(audio, 'sfx');
		audio.volume = routed ? 1 : 0.55 * volumes.sfx;
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
			const routed = connectElement(music, 'music');
			music.volume = routed ? 1 : MUSIC_VOLUME * volumes.music;
			applyGain('music');
		}
		resumeContext();
		if (music.paused) playQuietly(music);
	}

	function setVolume(channel: VolumeChannel, value: number): void {
		volumes = { ...volumes, [channel]: clampVolume(value) };
		applyGain(channel);
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
		applyGain('music');
		applyGain('sfx');
		applyGain('voice');
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
