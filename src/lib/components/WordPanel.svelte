<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LevelSession } from '#lib/game/session.svelte.js';
	import { getWordArt } from '#lib/content/index.js';
	import { isComplete, type Tile } from '#lib/game/puzzle.js';
	import { audio } from '#lib/audio/index.js';
	import LetterTile from './LetterTile.svelte';
	import Slot from './Slot.svelte';

	interface Props {
		session: LevelSession;
		hintsLeft?: number;
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

	let { session, hintsLeft = Number.POSITIVE_INFINITY, onclose }: Props = $props();

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
	const clue = $derived(
		session.openIndex !== null
			? getWordArt(session.locale, session.level, session.openIndex, session.packageId)
			: ''
	);
	let failedClue = $state<string | null>(null);
	const clueBroken = $derived(failedClue !== null && failedClue === clue);

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
			audio.playWord(
				session.locale,
				session.level,
				session.openIndex,
				session.packageId,
				session.voice
			);
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
			const done = session.word !== null && isComplete(session.word);
			if (done) {
				announcement = m.word_complete();
				if (session.openIndex !== null) {
					audio.playWord(
						session.locale,
						session.level,
						session.openIndex,
						session.packageId,
						session.voice
					);
				}
			} else {
				audio.playSfx('tile-place');
				announcement = m.letter_placed();
			}
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
			<button
				type="button"
				class="icon hint"
				aria-label={`${m.hint()}${Number.isFinite(hintsLeft) ? ` (${hintsLeft})` : ''}`}
				disabled={hintsLeft === 0}
				onclick={() => session.hint()}
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
			{#if Number.isFinite(hintsLeft)}
				<span class="hint-count" aria-hidden="true">{hintsLeft}</span>
			{/if}
			<button
				type="button"
				class="icon"
				aria-label={m.hear_word()}
				onclick={() =>
					session.openIndex !== null &&
					audio.playWord(
						session.locale,
						session.level,
						session.openIndex,
						session.packageId,
						session.voice
					)}
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

		<div class="word-area" class:complete>
			{#if clue && !clueBroken}
				<img
					class="clue"
					src={clue}
					alt=""
					data-clue
					loading="eager"
					decoding="async"
					onerror={() => (failedClue = clue || null)}
				/>
			{/if}
			<button
				type="button"
				class="hear"
				onclick={() =>
					session.openIndex !== null &&
					audio.playWord(
						session.locale,
						session.level,
						session.openIndex,
						session.packageId,
						session.voice
					)}
			>
				<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"
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
				>
				<span>{m.hear_word()}</span>
			</button>
			<div
				class="word-row"
				class:complete
				style="--tile-size: clamp(28px, calc((100vw - 68px) / 8), 56px)"
			>
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
		</div>

		{#if complete}
			<div class="done-card">
				<div class="confetti" aria-hidden="true">
					{#each Array(10) as _, index}
						<span style={`--i:${index}`}></span>
					{/each}
				</div>
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
	.icon.hint {
		position: relative;
	}
	.icon:disabled {
		opacity: 0.4;
	}
	.hint-count {
		display: grid;
		place-items: center;
		min-width: 26px;
		height: 26px;
		padding: 0 5px;
		border-radius: 13px;
		background: var(--lb-ink);
		color: var(--lb-paper);
		font-size: var(--lb-text-xs);
		font-weight: 800;
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
	.word-area {
		display: grid;
		justify-items: center;
		align-content: center;
		align-self: center;
		gap: var(--lb-space-3);
	}
	.clue {
		width: clamp(88px, 24vw, 120px);
		aspect-ratio: 1;
		border-radius: var(--lb-radius);
		object-fit: cover;
		background: var(--lb-paper-2);
		box-shadow: var(--lb-shadow-1);
	}
	.hear {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--lb-space-2);
		min-height: 44px;
		padding: 0 var(--lb-space-4);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		font-weight: 800;
		color: var(--lb-ink);
	}
	.hear .glyph {
		width: 20px;
		height: 20px;
	}
	.word-row {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: clamp(4px, 1.2vw, 8px);
		padding-block: var(--lb-space-4);
	}
	.word-row.complete {
		animation: row-glow 760ms var(--lb-ease) both;
	}
	.word-row.complete::after {
		position: absolute;
		bottom: 8px;
		left: 50%;
		width: min(80%, 340px);
		height: 4px;
		border-radius: 2px;
		background: var(--lb-gold);
		content: '';
		transform: translateX(-50%) scaleX(0);
		transform-origin: 50% 50%;
		animation: underline-draw 480ms var(--lb-ease) 260ms forwards;
	}
	.word-row.complete :global(> *) {
		position: relative;
		z-index: 1;
		animation: letter-settle 560ms var(--lb-ease-overshoot) both;
	}
	.word-row.complete :global(> :nth-child(2)) {
		animation-delay: 35ms;
	}
	.word-row.complete :global(> :nth-child(3)) {
		animation-delay: 70ms;
	}
	.word-row.complete :global(> :nth-child(4)) {
		animation-delay: 105ms;
	}
	.word-row.complete :global(> :nth-child(5)) {
		animation-delay: 140ms;
	}
	.word-row.complete :global(> :nth-child(6)) {
		animation-delay: 175ms;
	}
	.word-row.complete :global(> :nth-child(7)) {
		animation-delay: 210ms;
	}
	.word-row.complete :global(> :nth-child(8)) {
		animation-delay: 245ms;
	}
	@keyframes row-glow {
		0%,
		100% {
			filter: drop-shadow(0 0 0 transparent);
		}
		45% {
			filter: drop-shadow(0 0 10px color-mix(in srgb, var(--lb-gold) 60%, transparent));
		}
	}
	@keyframes underline-draw {
		to {
			transform: translateX(-50%) scaleX(1);
		}
	}
	@keyframes letter-settle {
		0% {
			transform: translateY(9px) scale(0.92);
		}
		55% {
			transform: translateY(-6px) scale(1.08);
		}
		100% {
			transform: translateY(0) scale(1);
		}
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
		position: relative;
		display: grid;
		animation: done-in 420ms var(--lb-ease-overshoot) 120ms both;
		justify-items: center;
		gap: var(--lb-space-4);
		padding: var(--lb-space-5);
		border-radius: var(--lb-radius);
		background: color-mix(in srgb, var(--lb-leaf) 14%, var(--lb-paper));
	}
	.confetti {
		position: absolute;
		inset: 50% auto auto 50%;
		width: 0;
		height: 0;
		pointer-events: none;
	}
	.confetti span {
		position: absolute;
		width: 8px;
		height: 12px;
		border-radius: 2px;
		background: var(--lb-gold);
		animation: confetti 620ms var(--lb-ease) both;
		transform: rotate(calc(var(--i) * 36deg)) translateY(0);
	}
	.confetti span:nth-child(3n) {
		background: var(--lb-berry);
	}
	.confetti span:nth-child(3n + 1) {
		background: var(--lb-leaf);
	}
	@keyframes done-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.97);
		}
	}
	@keyframes confetti {
		from {
			opacity: 0;
			transform: rotate(calc(var(--i) * 36deg)) translateY(0) scale(0.6);
		}
		30% {
			opacity: 1;
		}
		to {
			opacity: 0;
			transform: rotate(calc(var(--i) * 36deg)) translateY(-48px) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
		.word-row.complete,
		.word-row.complete :global(> *),
		.done-card {
			animation-delay: 0ms !important;
		}
		.word-row.complete::after {
			transform: translateX(-50%) scaleX(1);
			animation: none;
		}
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
		background: var(--lb-leaf-dark);
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
