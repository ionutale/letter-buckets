<script lang="ts">
	interface Props {
		index: 1 | 2 | 3;
		state: 'closed' | 'open' | 'done';
		word?: string;
		onclick?: () => void;
	}

	let { index, state, word, onclick }: Props = $props();

	const palette = ['var(--lb-leaf)', 'var(--lb-ochre)', 'var(--lb-berry)'];
	const color = $derived(palette[index - 1]);

	const label = $derived(
		state === 'done'
			? `Word ${index}${word ? `, ${word}` : ''}, tap to hear it`
			: `Open word ${index}`
	);
</script>

<button
	type="button"
	class="bucket"
	data-state={state}
	aria-label={label}
	style={`--bucket-color:${color}`}
	onclick={onclick}
>
	<span class="number" aria-hidden="true">{index}</span>
	<span class="pail" aria-hidden="true">
		<svg viewBox="0 0 120 120" role="presentation">
			<path
				class="handle"
				d="M30 42c0-17 13-30 30-30s30 13 30 30"
				fill="none"
				stroke="var(--bucket-shadow)"
				stroke-width="8"
				stroke-linecap="round"
			/>
			<path class="body" d="M18 44h84l-9 62c-2 8-9 14-17 14H44c-8 0-15-6-17-14z" />
			<path class="rim" d="M14 40h92l-2 14H16z" />
			{#if state === 'closed'}
				<path class="lid" d="M12 26h96l-4 18H16z" />
				<path class="ribbon" d="M58 26h8v18h-8z" />
			{:else if state === 'open'}
				<path class="lid tipped" d="M100 24h18l-6 18h-18z" />
				<circle class="glow" cx="60" cy="76" r="22" />
			{:else}
				<path class="lid off" d="M104 16l14 8-10 16-14-8z" />
				<path
					class="star"
					d="M60 54l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z"
				/>
			{/if}
		</svg>
	</span>
	{#if state === 'done' && word}
		<span class="word">{word}</span>
	{/if}
</button>

<style>
	.bucket {
		position: relative;
		display: grid;
		justify-items: center;
		gap: var(--lb-space-1);
		width: 100%;
		min-width: 0;
		padding: var(--lb-space-3) var(--lb-space-2) var(--lb-space-4);
		border-radius: var(--lb-radius);
		background: color-mix(in srgb, var(--bucket-color) 12%, var(--lb-paper));
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--bucket-color) 32%, transparent);
		transition:
			transform var(--lb-t-med) var(--lb-ease),
			background var(--lb-t-med) var(--lb-ease);
	}
	.bucket:active {
		transform: scale(0.97);
	}
	.pail {
		display: block;
		width: clamp(58px, 18vw, 84px);
		aspect-ratio: 1;
	}
	.pail svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.body {
		fill: var(--bucket-color);
	}
	.rim {
		fill: color-mix(in srgb, var(--bucket-color) 65%, #000);
	}
	.lid {
		fill: color-mix(in srgb, var(--bucket-color) 78%, #fff);
		transform-origin: 12px 44px;
		transition: transform var(--lb-t-arrive) var(--lb-ease-overshoot);
	}
	.lid.tipped,
	.lid.off {
		transform: translate(26px, -14px) rotate(18deg);
	}
	.handle {
		opacity: 0.8;
	}
	.ribbon {
		fill: var(--lb-berry);
	}
	.glow {
		fill: color-mix(in srgb, var(--lb-gold) 55%, transparent);
	}
	.star {
		fill: var(--lb-gold);
		stroke: var(--lb-ochre-dark);
		stroke-width: 2;
	}
	.number {
		position: absolute;
		top: var(--lb-space-2);
		left: var(--lb-space-2);
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--lb-paper);
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 800;
	}
	.word {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-size: var(--lb-text-sm);
		font-weight: 800;
		letter-spacing: 0.06em;
		color: var(--lb-ink);
	}
	.bucket[data-state='done'] {
		background: color-mix(in srgb, var(--bucket-color) 20%, var(--lb-paper));
	}
</style>
