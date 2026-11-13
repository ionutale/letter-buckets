<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LevelSession } from '#lib/game/session.svelte.js';
	import { isComplete, type Tile } from '#lib/game/puzzle.js';
	import { audio } from '#lib/audio/index.js';
	import LetterTile from './LetterTile.svelte';
	import Slot from './Slot.svelte';

	interface Props {
		session: LevelSession;
		onclose: () => void;
	}

	interface DragState {
		tileId: string;
		letter: string;
		x: number;
		y: number;
		startX: number;
		startY: number;
		moved: boolean;
	}

	let { session, onclose }: Props = $props();

	let selectedId = $state<string | null>(null);
	let suggestedSlot = $state<number | null>(null);
	let hintedSlot = $state<number | null>(null);
	let hintedTile = $state<string | null>(null);
	let announcement = $state('');
	let drag = $state<DragState | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let timers: number[] = [];
	let uiTimers: number[] = [];

	const word = $derived(session.word);
	const complete = $derived(word ? isComplete(word) : false);

	onMount(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		panelEl?.focus();

		const onVisibility = (): void => {
			if (document.hidden) session.pauseHints();
			else session.resumeHints();
		};

		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
				return;
			}
			if (event.key !== 'Tab' || !panelEl) return;
			const focusables = [...panelEl.querySelectorAll<HTMLElement>('button:not([disabled])')];
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('visibilitychange', onVisibility);
		document.addEventListener('keydown', onKey);
		if (session.openIndex !== null) {
			audio.playWord(session.locale, session.level, session.openIndex);
		}
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			document.removeEventListener('keydown', onKey);
			previousFocus?.focus();
		};
	});

	$effect(() => {
		const hint = session.lastHint;
		if (!hint) return;
		if (hint.kind === 'pulse-slot' || hint.kind === 'auto-place') {
			hintedSlot = hint.slot;
			hintedTile = null;
			const timer = window.setTimeout(() => {
				hintedSlot = null;
			}, 1400);
			uiTimers.push(timer);
		} else if (hint.kind === 'pulse-tile') {
			hintedTile = hint.tileId;
			hintedSlot = null;
			const timer = window.setTimeout(() => {
				hintedTile = null;
			}, 1400);
			uiTimers.push(timer);
		}
	});

	onDestroy(() => {
		for (const timer of timers) window.clearTimeout(timer);
		for (const timer of uiTimers) window.clearTimeout(timer);
	});

	function selectTile(tile: Tile): void {
		session.noteInteraction();
		selectedId = selectedId === tile.id ? null : tile.id;
		if (selectedId) audio.playSfx('tile-pick');
		announcement = selectedId ? m.letter_selected({ letter: tile.letter }) : '';
	}

	function attempt(tileId: string, slot: number): void {
		if (!word) return;
		const result = session.place(tileId, slot);
		selectedId = null;

		if (result.outcome === 'placed') {
			suggestedSlot = null;
			audio.playSfx('tile-place');
			announcement =
				session.word && isComplete(session.word) ? m.word_complete() : m.letter_placed();
			if (session.word && isComplete(session.word)) audio.playSfx('word-complete');
			return;
		}

		audio.playSfx('tile-wrong');
		announcement = m.try_another();
		if (result.outcome === 'wrong-word' && result.suggestedSlot !== undefined) {
			suggestedSlot = result.suggestedSlot;
			const timer = window.setTimeout(() => {
				suggestedSlot = null;
			}, 900);
			timers.push(timer);
		}
	}

	function onSlot(slot: number): void {
		session.noteInteraction();
		if (selectedId) attempt(selectedId, slot);
	}

	function onTilePointerDown(event: PointerEvent, tile: Tile): void {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		session.noteInteraction();
		drag = {
			tileId: tile.id,
			letter: tile.letter,
			x: event.clientX,
			y: event.clientY,
			startX: event.clientX,
			startY: event.clientY,
			moved: false
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onTilePointerMove(event: PointerEvent): void {
		if (!drag) return;
		if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
			drag.moved = true;
		}
		if (drag.moved) {
			drag.x = event.clientX;
			drag.y = event.clientY;
		}
	}

	function onTilePointerUp(event: PointerEvent): void {
		if (!drag) return;
		const current = drag;
		drag = null;

		if (!current.moved) {
			const tile = word?.remaining.find((entry) => entry.id === current.tileId);
			if (tile) selectTile(tile);
			return;
		}

		const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
		if (!target) return;
		const slot = Number(target.getAttribute('data-slot'));
		if (Number.isInteger(slot)) attempt(current.tileId, slot);
	}

	function onTileKeydown(event: KeyboardEvent, tile: Tile): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		selectTile(tile);
	}

	function close(): void {
		selectedId = null;
		drag = null;
		audio.stopWord();
		onclose();
	}
</script>

{#if word}
	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		aria-label={m.word_of({ i: session.openIndex! + 1 })}
		data-hint-step={session.hintStep}
		data-last-hint={session.lastHint?.kind ?? ''}
		tabindex="-1"
		bind:this={panelEl}
	>
		<header class="panel-head">
			<button type="button" class="icon" aria-label="Close" onclick={close}>×</button>
			<p>{m.word_of({ i: session.openIndex! + 1 })}</p>
			<button type="button" class="icon hint" aria-label={m.hint()} onclick={() => session.hint()}
				><svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"
					><path
						d="M9 18h6M10 21h4M8 14a5 5 0 1 1 8 0c-.8.8-1.2 1.8-1.2 3H9.2c0-1.2-.4-2.2-1.2-3z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				></button
			>
			<button
				type="button"
				class="icon"
				aria-label={m.hear_word()}
				onclick={() =>
					session.openIndex !== null &&
					audio.playWord(session.locale, session.level, session.openIndex)}
				><svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"
					><path
						d="M4 9h4l5-4v14l-5-4H4z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/><path
						d="M16 8a5 5 0 0 1 0 8"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/></svg
				></button
			>
		</header>

		<div class="word-row" style="--tile-size: clamp(34px, 9vw, 56px)">
			{#each [...word.spec.word] as letter, index}
				{#if word.spec.gaps.includes(index)}
					<Slot
						{index}
						letter={word.spec.word[index]}
						filled={index in word.placed}
						suggested={suggestedSlot === index || hintedSlot === index}
						onplace={() => onSlot(index)}
					/>
				{:else}
					<LetterTile {letter} state="revealed" />
				{/if}
			{/each}
		</div>

		{#if complete}
			<div class="done-card">
				<p class="done-title">{m.word_complete()}</p>
				<button type="button" class="back" onclick={close}>{m.back_to_buckets()}</button>
			</div>
		{:else}
			<div class="tray" aria-label="Letter tiles">
				{#each word.remaining as tile (tile.id)}
					<LetterTile
						letter={tile.letter}
						state={selectedId === tile.id ? 'selected' : 'tile'}
						dataTile={tile.id}
						dataDecoy={tile.decoy}
						hinted={hintedTile === tile.id}
						onpointerdown={(event) => onTilePointerDown(event, tile)}
						onpointermove={onTilePointerMove}
						onpointerup={onTilePointerUp}
						onpointercancel={() => (drag = null)}
						onkeydown={(event) => onTileKeydown(event, tile)}
					/>
				{/each}
			</div>
		{/if}

		<p class="sr-only" aria-live="polite">{announcement}</p>
	</div>
{/if}

{#if drag?.moved}
	<div class="ghost" style={`left:${drag.x}px; top:${drag.y}px`} aria-hidden="true">
		{drag.letter}
	</div>
{/if}

<style>
	.panel {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		grid-template-rows: auto 1fr auto;
		align-content: stretch;
		gap: var(--lb-space-6);
		padding: max(var(--lb-safe-top), var(--lb-space-4)) var(--lb-space-4)
			max(var(--lb-safe-bottom), var(--lb-space-4));
		background: var(--lb-paper);
		overflow: hidden;
	}
	.panel-head {
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
	}
	.panel-head p {
		flex: 1;
		margin: 0;
		font-weight: 700;
		color: var(--lb-ink-soft);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--lb-paper-2);
		font-size: 1.5rem;
	}
	.glyph {
		width: 22px;
		height: 22px;
	}
	.word-row {
		display: flex;
		justify-content: center;
		align-items: center;
		align-self: center;
		gap: clamp(4px, 1.2vw, 8px);
		padding-block: var(--lb-space-4);
	}
	.tray,
	.done-card {
		align-self: end;
	}
	.tray {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--lb-space-2);
		padding: var(--lb-space-4);
		border-radius: var(--lb-radius);
		background: color-mix(in srgb, var(--lb-paper-2) 70%, transparent);
	}
	.done-card {
		display: grid;
		justify-items: center;
		gap: var(--lb-space-4);
		padding: var(--lb-space-5);
		border-radius: var(--lb-radius);
		background: color-mix(in srgb, var(--lb-leaf) 14%, var(--lb-paper));
	}
	.done-title {
		margin: 0;
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-lg);
		font-weight: 800;
	}
	.back {
		min-height: 48px;
		padding: 0 var(--lb-space-5);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-leaf);
		color: #fff;
		font-weight: 800;
	}
	.ghost {
		position: fixed;
		z-index: 50;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		transform: translate(-50%, -50%) rotate(-4deg);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper);
		box-shadow:
			inset 0 0 0 2px var(--lb-ochre),
			var(--lb-shadow-2);
		font-family: var(--lb-font-display);
		font-size: 1.7rem;
		font-weight: 800;
		pointer-events: none;
	}
</style>
