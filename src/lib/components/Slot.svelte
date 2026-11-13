<script lang="ts">
	interface Props {
		index: number;
		letter: string;
		filled: boolean;
		suggested?: boolean;
		onplace?: () => void;
	}

	let { index, letter, filled, suggested = false, onplace }: Props = $props();
</script>

<button
	type="button"
	class="slot"
	class:filled
	class:suggested
	data-slot={index}
	data-letter={letter}
	data-filled={filled}
	aria-label={filled ? `Letter ${letter}` : `Empty slot ${index + 1}`}
	disabled={filled}
	onclick={onplace}
>
	{#if filled}{letter}{/if}
</button>

<style>
	.slot {
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
		background: color-mix(in srgb, var(--lb-paper-2) 60%, transparent);
		border: 2px dashed color-mix(in srgb, var(--lb-ink-soft) 45%, transparent);
		box-shadow: none;
		touch-action: none;
	}
	.slot.filled {
		background: var(--lb-paper-2);
		border: 0;
		box-shadow:
			inset 0 0 0 2px var(--lb-border),
			0 4px 0 var(--lb-border);
		animation: pop var(--lb-t-pop) var(--lb-ease-overshoot);
	}
	.slot.suggested {
		animation: suggest 700ms ease-in-out 2;
	}
	@keyframes pop {
		0% {
			transform: scale(0.86);
		}
		60% {
			transform: scale(1.06);
		}
		100% {
			transform: scale(1);
		}
	}
	@keyframes suggest {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--lb-ochre) 0%, transparent);
		}
		50% {
			box-shadow: 0 0 0 6px color-mix(in srgb, var(--lb-ochre) 35%, transparent);
		}
	}
</style>
