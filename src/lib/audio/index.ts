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
	const routed = new WeakSet<HTMLAudioElement>();
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
			// Whatever gets the context running — a gesture, an interruption ending,
			// a resume settling — music must end up inside the graph or its slider
			// has nothing to move.
			context.addEventListener?.('statechange', () => linkMusic());
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

	/** Music outlives the suspension that started it: link it when we can. */
	function linkMusic(): void {
		if (!context || context.state !== 'running') return;
		if (!music || routed.has(music)) return;
		connectElement(music, 'music');
		if (routed.has(music)) {
			// The channel gain owns the level from here. Leaving the element's own
			// volume set would apply the same factor twice and muffle the loop.
			music.volume = 1;
		}
		applyGain('music');
	}

	function resumeContext(): void {
		// iOS reports "interrupted" after calls, alarms and the screen lock, and a
		// suspended context is what a first tap usually leaves behind.
		if (context?.state !== 'suspended' && context?.state !== 'interrupted') {
			linkMusic();
			return;
		}
		void context
			.resume()
			.then(() => linkMusic())
			.catch(() => undefined);
	}

	function connectElement(audio: HTMLAudioElement, channel: VolumeChannel): boolean {
		if (!ensureGraph() || !context || !gains) return false;
		if (routed.has(audio)) return true;
		// A suspended graph is not rendering yet: routing a clip into it drops
		// everything until the context resumes, which swallows the word's first
		// phoneme. Play those natively until the context is running.
		if (context.state !== 'running') {
			resumeContext();
			return false;
		}
		try {
			const source = context.createMediaElementSource(audio);
			source.connect(gains[channel]);
			routed.add(audio);
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
		if (music && !routed.has(music)) {
			// Moving the slider is a gesture: another chance to get music routed.
			connectElement(music, 'music');
			applyGain('music');
		}
		if (music && !routed.has(music) && !muted) {
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
		if (!routed.has(music)) music.volume = DUCKED_VOLUME * volumes.music;
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
		const path = wordAudioPath(locale, level, index, packageId, voice);
		// A buffered element starts cleanly. A fresh one, routed into the graph
		// and played in the same tick, can lose its first chunk while the media
		// element is still filling — which sounds like a missing first letter.
		const preloaded = preloads.get(path);
		preloads.delete(path);
		const audio = preloaded ?? make();
		if (!preloaded) audio.src = path;
		const routed = connectElement(audio, 'voice');
		audio.volume = routed ? 1 : 0.9 * volumes.voice;
		audio.addEventListener('ended', () => {
			restoreMusic();
			warm(path);
		});
		audio.addEventListener('error', restoreMusic, { once: true });
		word = audio;
		playQuietly(audio);
	}

	/** Keeps one element warm for a repeat, without holding on to many. */
	function warm(path: string): void {
		if (preloads.has(path) || muted) return;
		const audio = make();
		audio.preload = 'auto';
		audio.volume = 0;
		audio.src = path;
		preloads.set(path, audio);
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
