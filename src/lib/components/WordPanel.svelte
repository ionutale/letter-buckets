<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { LevelSession } from '#lib/game/session.svelte.js';
	import { isComplete, type Tile } from '#lib/game/puzzle.js';
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
	let announcement = $state('');
	let drag = $state<DragState | null>(null);
	let timers: number[] = [];

	const word = $derived(session.word);
	const complete = $derived(word ? isComplete(word) : false);

	onDestroy(() => {
		for (const timer of timers) window.clearTimeout(timer);
	});

	function selectTile(tile: Tile): void {
		selectedId = selectedId === tile.id ? null : tile.id;
		announcement = selectedId ? `Letter ${tile.letter} selected` : '';
	}

	function attempt(tileId: string, slot: number): void {
		if (!word) return;
		const result = session.place(tileId, slot);
		selectedId = null;

		if (result.outcome === 'placed') {
			suggestedSlot = null;
			announcement = session.word && isComplete(session.word) ? 'Word complete' : 'Letter placed';
			return;
		}

		announcement = 'Try another letter';
		if (result.outcome === 'wrong-word' && result.suggestedSlot !== undefined) {
			suggestedSlot = result.suggestedSlot;
			const timer = window.setTimeout(() => {
				suggestedSlot = null;
			}, 900);
			timers.push(timer);
		}
	}

	function onSlot(slot: number): void {
		if (selectedId) attempt(selectedId, slot);
	}

	function onTilePointerDown(event: PointerEvent, tile: Tile): void {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
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
		onclose();
	}
</script>

{#if word}
	<div class="panel" role="dialog" aria-modal="true" aria-label={`Word ${session.openIndex! + 1} of 3`}>
		<header class="panel-head">
			<button type="button" class="icon" aria-label="Close" onclick={close}>×</button>
			<p>Word {session.openIndex! + 1} of 3</p>
			<span class="speaker" aria-hidden="true">🔊</span>
		</header>

		<div class="word-row" style="--tile-size: clamp(34px, 9vw, 56px)">
			{#each [...word.spec.word] as letter, index}
				{#if word.spec.gaps.includes(index)}
					<Slot
						index={index}
						letter={word.spec.word[index]}
						filled={index in word.placed}
						suggested={suggestedSlot === index}
						onplace={() => onSlot(index)}
					/>
				{:else}
					<LetterTile {letter} state="revealed" />
				{/if}
			{/each}
		</div>

		{#if complete}
			<div class="done-card">
				<p class="done-title">Word complete!</p>
				<button type="button" class="back" onclick={close}>Back to buckets</button>
			</div>
		{:else}
			<div class="tray" aria-label="Letter tiles">
				{#each word.remaining as tile (tile.id)}
					<LetterTile
						letter={tile.letter}
						state={selectedId === tile.id ? 'selected' : 'tile'}
						dataTile={tile.id}
						dataDecoy={tile.decoy}
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
		align-content: start;
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
	.speaker {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--lb-paper-2);
		font-size: 1.1rem;
		opacity: 0.55;
	}
	.word-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: clamp(4px, 1.2vw, 8px);
		padding-block: var(--lb-space-4);
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
