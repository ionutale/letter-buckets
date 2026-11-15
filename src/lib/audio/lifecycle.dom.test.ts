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

function setVisibility(value: 'visible' | 'hidden') {
	Object.defineProperty(document, 'visibilityState', { value, configurable: true });
}

function controller() {
	const created: FakeAudio[] = [];
	const audio = createAudioController({
		createAudio: () => {
			const element = new FakeAudio();
			created.push(element);
			return element as unknown as HTMLAudioElement;
		}
	});
	return { audio, created };
}

describe('audio lifecycle', () => {
	it('pauses every channel when hidden and resumes music when visible', () => {
		setVisibility('visible');
		const { audio, created } = controller();
		audio.unlock();
		const music = created[0];
		expect(music.paused).toBe(false);

		setVisibility('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(music.pause).toHaveBeenCalled();
		expect(music.paused).toBe(true);

		setVisibility('visible');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(music.play).toHaveBeenCalledTimes(2);
		expect(music.paused).toBe(false);
	});

	it('does not restart music after the player is muted', () => {
		setVisibility('visible');
		const { audio, created } = controller();
		audio.unlock();
		const music = created[0];
		audio.setMuted(true);

		setVisibility('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		setVisibility('visible');
		document.dispatchEvent(new Event('visibilitychange'));

		expect(music.paused).toBe(true);
		expect(music.play).toHaveBeenCalledTimes(1);
	});

	it('pauses on pagehide even when the page is still visible', () => {
		setVisibility('visible');
		const { audio, created } = controller();
		audio.unlock();
		const music = created[0];

		window.dispatchEvent(new Event('pagehide'));
		expect(music.paused).toBe(true);
	});
});
