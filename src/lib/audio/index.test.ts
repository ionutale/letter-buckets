import { describe, expect, it, vi } from 'vitest';
import { createAudioController, wordAudioPath } from './index.js';

describe('wordAudioPath', () => {
	it('pads the level and word indexes', () => {
		expect(wordAudioPath('en', 1, 0)).toBe('/audio/words/en/l01-w1.mp3');
		expect(wordAudioPath('ru', 50, 2)).toBe('/audio/words/ru/l50-w3.mp3');
	});
});

describe('audio controller', () => {
	function fakeAudio() {
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
		return FakeAudio;
	}

	it('plays a word, stops the previous one, and respects mute', () => {
		const Fake = fakeAudio();
		const created: InstanceType<typeof Fake>[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new Fake();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.playWord('en', 1, 0);
		expect(created[0].src).toContain('/audio/words/en/l01-w1.mp3');
		expect(created[0].play).toHaveBeenCalled();

		controller.playWord('en', 1, 1);
		expect(created[0].pause).toHaveBeenCalled();
		expect(created[1].src).toContain('/audio/words/en/l01-w2.mp3');

		controller.setMuted(true);
		const before = created.length;
		controller.playWord('en', 1, 2);
		expect(created.length).toBe(before);
	});

	it('ducks the music and replaces overlapping effects', () => {
		const Fake = fakeAudio();
		const created: InstanceType<typeof Fake>[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new Fake();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.unlock();
		const music = created[0];
		expect(music.src).toContain('/audio/music/loop.mp3');

		controller.playWord('en', 1, 0);
		expect(music.volume).toBeLessThan(0.16);

		controller.playSfx('tile-pick');
		const firstSfx = created.at(-1)!;
		controller.playSfx('tile-place');
		expect(firstSfx.pause).toHaveBeenCalled();

		controller.setMuted(true);
		expect(music.pause).toHaveBeenCalled();
	});

	it('preloads the three clips of a level', () => {
		const Fake = fakeAudio();
		const created: InstanceType<typeof Fake>[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new Fake();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.preloadLevel('ro', 7);
		expect(created.map((audio) => audio.src)).toEqual([
			'/audio/words/ro/l07-w1.mp3',
			'/audio/words/ro/l07-w2.mp3',
			'/audio/words/ro/l07-w3.mp3'
		]);
	});
});

describe('channel volumes', () => {
	it('scales music, effects and voice independently', () => {
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
		const created: InstanceType<typeof FakeAudio>[] = [];
		const controller = createAudioController({
			createAudio: () => {
				const audio = new FakeAudio();
				created.push(audio);
				return audio as unknown as HTMLAudioElement;
			}
		});

		controller.setVolumes({ music: 0.5, sfx: 0.5, voice: 0.5 });
		controller.unlock();
		expect(created[0].volume).toBeCloseTo(0.08);

		controller.playWord('en', 1, 0);
		expect(created.at(-1)!.volume).toBeCloseTo(0.45);

		controller.playSfx('tile-pick');
		expect(created.at(-1)!.volume).toBeCloseTo(0.275);

		controller.setVolume('music', 0);
		expect(created[0].volume).toBe(0);
		expect(controller.volumes).toEqual({ music: 0, sfx: 0.5, voice: 0.5 });
	});
});
