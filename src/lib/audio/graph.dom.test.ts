import { describe, expect, it, vi } from 'vitest';
import { createAudioController } from './index.js';

class FakeAudio {
	src = '';
	volume = 1;
	loop = false;
	preload = '';
	paused = true;
	play = vi.fn(async () => {
		this.paused = false;
	});
	pause = vi.fn(() => {
		this.paused = true;
	});
	addEventListener = vi.fn();
}

function installContext(state: 'suspended' | 'running') {
	const createSource = vi.fn(() => ({ connect: vi.fn() }));
	const gainCalls: number[] = [];
	const silentStarts: number[] = [];
	class FakeContext {
		state = state;
		destination = {};
		currentTime = 0;
		createGain() {
			return {
				connect: vi.fn(),
				gain: {
					cancelScheduledValues: vi.fn(),
					setTargetAtTime: vi.fn((value: number) => {
						gainCalls.push(Number(value.toFixed(3)));
					})
				}
			};
		}
		createMediaElementSource = createSource;
		createBuffer = vi.fn(() => ({}));
		createBufferSource = vi.fn(() => ({
			buffer: null,
			connect: vi.fn(),
			start: vi.fn(() => {
				silentStarts.push(1);
			})
		}));
		suspend = vi.fn(async () => {
			this.state = 'suspended';
		});
		// Resolve a tick later, like a real device: audio started in the same tick
		// still sees a suspended context.
		resume = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					setTimeout(() => {
						this.state = 'running';
						resolve();
					}, 0);
				})
		);
	}
	Object.defineProperty(window, 'AudioContext', {
		value: FakeContext,
		configurable: true,
		writable: true
	});
	return { createSource, gainCalls, silentStarts };
}

describe('audio graph', () => {
	it('routes words through the graph once the context is running', () => {
		const { createSource } = installContext('running');
		const controller = createAudioController({
			createAudio: () => new FakeAudio() as unknown as HTMLAudioElement
		});
		controller.playWord('en', 1, 0);
		expect(createSource).toHaveBeenCalledTimes(1);
	});

	it('applies the music slider to an element that is not routed yet', () => {
		installContext('suspended');
		const created: FakeAudio[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new FakeAudio();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.unlock();
		const music = created[0];
		expect(music.src).toContain('loop.mp3');
		expect(music.volume).toBeGreaterThan(0);

		controller.setVolume('music', 0);
		expect(music.volume).toBe(0);
	});

	it('links music into the graph once the context resumes', async () => {
		const { createSource } = installContext('suspended');
		const created: FakeAudio[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new FakeAudio();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.unlock();
		expect(createSource).not.toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 5));
		expect(createSource).toHaveBeenCalledTimes(1);
		// The element must hand its level to the graph, or the factor applies twice.
		expect(created[0].volume).toBe(1);
	});

	it('plays natively while the audio context is still suspended', () => {
		// Routing into a suspended graph silently swallows the start of the clip.
		const { createSource } = installContext('suspended');
		const created: FakeAudio[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new FakeAudio();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.playWord('en', 1, 0);
		expect(createSource).not.toHaveBeenCalled();
		expect(created[0].play).toHaveBeenCalled();
	});

	it('warms the output with a silent buffer before real audio', () => {
		const { silentStarts } = installContext('running');
		const controller = createAudioController({
			createAudio: () => new FakeAudio() as unknown as HTMLAudioElement
		});
		controller.unlock();
		expect(silentStarts.length).toBeGreaterThan(0);
	});

	it('warms again after a suspension', async () => {
		const { silentStarts } = installContext('suspended');
		const controller = createAudioController({
			createAudio: () => new FakeAudio() as unknown as HTMLAudioElement
		});
		controller.unlock();
		await new Promise((resolve) => setTimeout(resolve, 5));
		expect(silentStarts.length).toBeGreaterThan(0);
	});

	it('schedules the gain of each channel as its slider moves', () => {
		const { gainCalls } = installContext('running');
		const controller = createAudioController({
			createAudio: () => new FakeAudio() as unknown as HTMLAudioElement
		});

		controller.unlock();
		expect(gainCalls.slice(0, 3)).toEqual([0.16, 0.55, 0.9]);

		controller.setVolume('music', 0.5);
		expect(gainCalls.at(-1)).toBeCloseTo(0.08);

		controller.setVolume('sfx', 0);
		expect(gainCalls.at(-1)).toBe(0);

		controller.setVolume('voice', 1);
		expect(gainCalls.at(-1)).toBeCloseTo(0.9);

		controller.setVolume('music', 0);
		expect(gainCalls.at(-1)).toBe(0);
	});

	it('silences the music gain when muted and restores it on unmute', () => {
		const { gainCalls } = installContext('running');
		const controller = createAudioController({
			createAudio: () => new FakeAudio() as unknown as HTMLAudioElement
		});

		controller.setVolume('music', 0.5);
		controller.unlock();
		controller.setMuted(true);
		expect(gainCalls.at(-1)).toBe(0);

		controller.setMuted(false);
		// Unmute restores every channel: music, effects, voice.
		expect(gainCalls.slice(-3)).toEqual([0.08, 0.55, 0.9]);
	});
});
