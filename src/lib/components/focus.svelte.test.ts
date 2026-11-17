import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { createLevelSession, type LevelSession } from '#lib/game/session.svelte.js';
import LevelComplete from './LevelComplete.svelte';
import WordPanel from './WordPanel.svelte';

/** A stand-in for the bucket button that had focus before a dialog opened. */
function sentinel(): HTMLButtonElement {
	const element = document.createElement('button');
	element.textContent = 'Bucket';
	document.body.appendChild(element);
	return element;
}

function solve(session: LevelSession): void {
	for (let index = 0; index < 3; index++) {
		session.openBucket(index);
		const gaps = [...session.word!.spec.gaps];
		for (const gap of gaps) {
			const letter = session.word!.spec.word[gap];
			const tile = session.word!.remaining.find((entry) => entry.letter === letter && !entry.decoy)!;
			session.place(tile.id, gap);
		}
		session.closeWord();
	}
}

describe('dialog focus management', () => {
	it('moves focus into the word panel, keeps it trapped and restores it on close', async () => {
		const bucket = sentinel();
		bucket.focus();
		expect(document.activeElement).toBe(bucket);

		const session = createLevelSession(1, 'en');
		session.openBucket(0);
		const onclose = vi.fn();
		const rendered = render(WordPanel, { session, onclose });

		const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
		expect(dialog).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(dialog));

		// Shift+Tab from the dialog container itself must not reach the bucket.
		await fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
		expect(dialog.contains(document.activeElement)).toBe(true);
		expect(document.activeElement).not.toBe(bucket);

		// Tab from the last focusable wraps back to the first inside the dialog.
		const buttons = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled])')];
		buttons[buttons.length - 1].focus();
		await fireEvent.keyDown(document, { key: 'Tab' });
		expect(document.activeElement).toBe(buttons[0]);

		// A keyboard placement disables the focused slot; focus must be parked
		// on another control inside the dialog rather than falling to <body>.
		const gap = session.word!.spec.gaps[0];
		const letter = session.word!.spec.word[gap];
		const tile = session.word!.remaining.find((entry) => entry.letter === letter && !entry.decoy)!;
		const tileEl = dialog.querySelector<HTMLElement>(`[data-tile="${tile.id}"]`)!;
		tileEl.focus();
		await fireEvent.keyDown(tileEl, { key: 'Enter' });
		const slotEl = dialog.querySelector<HTMLElement>(`[data-slot="${gap}"]`)!;
		slotEl.focus();
		await fireEvent.click(slotEl);
		await tick();
		expect(dialog.contains(document.activeElement)).toBe(true);
		expect(document.activeElement).not.toBe(document.body);

		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
		rendered.unmount();
		await waitFor(() => expect(document.activeElement).toBe(bucket));
		bucket.remove();
	});

	it('moves focus into the level-complete dialog, traps it and restores it on close', async () => {
		const previous = sentinel();
		previous.focus();

		const session = createLevelSession(1, 'en');
		solve(session);
		expect(session.complete).toBe(true);

		const onclose = vi.fn();
		const rendered = render(LevelComplete, { session, onclose });

		const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
		expect(dialog).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(dialog));

		await fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
		expect(dialog.contains(document.activeElement)).toBe(true);
		await fireEvent.keyDown(dialog, { key: 'Tab' });
		expect(dialog.contains(document.activeElement)).toBe(true);

		await fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
		rendered.unmount();
		await waitFor(() => expect(document.activeElement).toBe(previous));
		previous.remove();
	});
});
