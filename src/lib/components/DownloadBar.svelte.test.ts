import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '#lib/paraglide/messages.js';
import { downloads } from '#lib/pwa/downloads.svelte.js';
import DownloadBar from './DownloadBar.svelte';

describe('DownloadBar', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		downloads.progress.active = false;
		downloads.progress.failed = false;
		downloads.progress.done = 0;
		downloads.progress.total = 0;
		downloads.progress.pkg = null;
	});

	afterEach(() => {
		downloads.progress.failed = false;
		vi.useRealTimers();
	});

	it('shows a failure label after a failed run and dismisses it', async () => {
		const { container } = render(DownloadBar);
		expect(container.querySelector('.download-bar')).toBeNull();

		downloads.progress.failed = true;
		await tick();

		expect(screen.getByRole('status').textContent).toContain(m.download_failed());
		expect(container.querySelector('.download-bar')).not.toBeNull();

		await vi.advanceTimersByTimeAsync(7999);
		await tick();
		expect(container.querySelector('.download-bar')).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		await tick();
		expect(container.querySelector('.download-bar')).toBeNull();
	});
});
