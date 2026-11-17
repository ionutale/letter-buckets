<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		letter?: string;
		state: 'revealed' | 'empty' | 'tile' | 'selected' | 'placed';
		label?: string;
		dataTile?: string;
		dataDecoy?: boolean;
		hinted?: boolean;
		onclick?: () => void;
		onpointerdown?: (event: PointerEvent) => void;
		onpointermove?: (event: PointerEvent) => void;
		onpointerup?: (event: PointerEvent) => void;
		onpointercancel?: (event: PointerEvent) => void;
		onkeydown?: (event: KeyboardEvent) => void;
	}

	let {
		letter = '',
		state,
		label,
		dataTile,
		dataDecoy,
		hinted = false,
		onclick,
		onpointerdown,
		onpointermove,
		onpointerup,
		onpointercancel,
		onkeydown
	}: Props = $props();

	const accessibleLabel = $derived(
		label ??
			(state === 'empty'
				? m.empty_letter_slot()
				: state === 'tile' || state === 'selected'
					? m.letter_tile({ letter })
					: letter)
	);
</script>

{#if state === 'empty'}
	<span class="tile empty" data-state="empty" role="img" aria-label={accessibleLabel}></span>
{:else}
	<button
		type="button"
		class="tile {state}"
		class:hinted
		data-state={state}
		data-letter={letter}
		data-tile={dataTile}
		data-decoy={dataDecoy ? 'true' : undefined}
		aria-label={accessibleLabel}
		aria-pressed={state === 'selected'}
		{onclick}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onpointercancel}
		{onkeydown}
	>
		{letter}
	</button>
{/if}

<style>
	.tile {
		display: grid;
		place-items: center;
		width: var(--tile-size, clamp(38px, 10vw, 58px));
		height: var(--tile-size, clamp(38px, 10vw, 58px));
		border-radius: var(--lb-radius-sm);
		font-family: var(--lb-font-display);
		font-size: calc(var(--tile-size, clamp(38px, 10vw, 58px)) * 0.5);
		font-weight: 800;
		line-height: 1;
		color: var(--lb-ink);
		user-select: none;
		touch-action: none;
	}
	.tile.revealed,
	.tile.placed {
		background: var(--lb-paper-2);
		box-shadow:
			inset 0 0 0 2px var(--lb-border),
			0 4px 0 var(--lb-border);
	}
	.tile.tile,
	.tile.selected {
		background: var(--lb-paper);
		box-shadow:
			inset 0 0 0 2px var(--lb-border),
			0 5px 0 var(--lb-border),
			var(--lb-shadow-1);
		transition:
			transform var(--lb-t-fast) var(--lb-ease),
			box-shadow var(--lb-t-fast) var(--lb-ease);
	}
	.tile.tile:active {
		transform: translateY(3px);
		box-shadow:
			inset 0 0 0 2px var(--lb-border),
			0 2px 0 var(--lb-border);
	}
	.tile.selected {
		transform: translateY(-4px) scale(1.04);
		box-shadow:
			inset 0 0 0 3px var(--lb-ochre),
			0 7px 0 var(--lb-ochre-dark),
			var(--lb-shadow-2);
	}
	.tile.empty {
		background: color-mix(in srgb, var(--lb-paper-2) 60%, transparent);
		border: 2px dashed color-mix(in srgb, var(--lb-ink-soft) 45%, transparent);
		box-shadow: none;
	}
	.tile.hinted {
		box-shadow:
			inset 0 0 0 3px var(--lb-gold),
			0 7px 0 var(--lb-ochre-dark),
			var(--lb-shadow-2);
		animation: hint 700ms ease-in-out 2;
	}
	@keyframes hint {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}
</style>
