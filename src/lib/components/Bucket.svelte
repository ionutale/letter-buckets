<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		index: number;
		status: 'closed' | 'open' | 'done';
		word?: string;
		image?: string;
		onclick?: () => void;
	}

	let { index, status, word, image, onclick }: Props = $props();
	let failedImage = $state<string | null>(null);
	const clueBroken = $derived(failedImage !== null && failedImage === image);

	const palette = ['var(--lb-leaf)', 'var(--lb-ochre)', 'var(--lb-berry)'];
	const color = $derived(palette[index - 1]);

	const label = $derived(
		status === 'done'
			? m.word_done_label({ n: index, word: word ?? '' })
			: m.open_word({ n: index })
	);
</script>

<button
	type="button"
	class="bucket"
	data-state={status}
	aria-label={label}
	style={`--bucket-color:${color};--bucket-shadow:color-mix(in srgb, ${color} 55%, #000);--i:${index - 1}`}
	{onclick}
>
	<span class="number" aria-hidden="true">{index}</span>
	<span class="pail" aria-hidden="true">
		<svg viewBox="0 0 120 120" role="presentation">
			<path class="body" d="M18 44h84l-9 62c-2 8-9 14-17 14H44c-8 0-15-6-17-14z" />
			<path class="rim" d="M14 40h92l-2 14H16z" />
			<path
				class="handle"
				d="M30 44c0-18 13-32 30-32s30 14 30 32"
				fill="none"
				stroke="var(--bucket-shadow)"
				stroke-width="8"
				stroke-linecap="round"
			/>
			{#if status === 'closed'}
				<path class="lid" d="M12 26h96l-4 18H16z" />
				<path class="ribbon" d="M58 26h8v18h-8z" />
			{:else if status === 'open'}
				<path class="lid tipped" d="M100 24h18l-6 18h-18z" />
				<circle class="glow" cx="60" cy="76" r="22" />
			{:else}
				<path class="lid off" d="M12 26h96l-4 18H16z" />
				<path
					class="check"
					d="M42 74l12 12 24-28"
					fill="none"
					stroke-width="9"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}
		</svg>
		{#if image && !clueBroken && status !== 'done'}
			<img
				class="clue"
				src={image}
				alt=""
				loading="lazy"
				decoding="async"
				onerror={() => (failedImage = image ?? null)}
			/>
		{/if}
	</span>
	{#if status === 'done'}
		<span class="done-badge" aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<path
					d="M5 12.5l4.5 4.5L19 7.5"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
	{/if}
	{#if status === 'done' && word}
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
		animation: arrive 480ms var(--lb-ease-overshoot) backwards;
		animation-delay: calc(var(--i) * var(--lb-stagger));
	}
	.bucket[data-state='closed'] .pail {
		animation: float 5s ease-in-out 1.2s infinite;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
	.bucket:active {
		transform: scale(0.97);
	}
	.pail {
		position: relative;
		display: block;
		width: clamp(86px, 24vw, 112px);
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
	.clue {
		position: absolute;
		left: 50%;
		top: 41%;
		width: 62%;
		aspect-ratio: 1;
		transform: translateX(-50%);
		border-radius: 10px;
		object-fit: cover;
		background: var(--lb-paper);
		box-shadow: 0 2px 0 color-mix(in srgb, var(--bucket-color) 45%, transparent);
	}
	.rim {
		fill: color-mix(in srgb, var(--bucket-color) 65%, #000);
	}
	.lid {
		fill: color-mix(in srgb, var(--bucket-color) 78%, #fff);
		transform-origin: 12px 44px;
		transition: transform var(--lb-t-arrive) var(--lb-ease-overshoot);
	}
	.lid.tipped {
		transform: translate(26px, -14px) rotate(18deg);
	}
	.lid.off {
		transform: translate(26px, -14px) rotate(18deg);
		animation: lid-pop var(--lb-t-arrive) var(--lb-ease-overshoot) both;
	}
	@keyframes lid-pop {
		from {
			transform: none;
		}
		to {
			transform: translate(26px, -14px) rotate(18deg);
		}
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
	.check {
		stroke: var(--lb-gold);
		stroke-dasharray: 52;
		stroke-dashoffset: 52;
		animation: draw-check 420ms var(--lb-ease) 120ms forwards;
	}
	@keyframes draw-check {
		to {
			stroke-dashoffset: 0;
		}
	}
	.done-badge {
		position: absolute;
		top: var(--lb-space-2);
		right: var(--lb-space-2);
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--lb-leaf-dark);
		color: #fff;
		box-shadow: var(--lb-shadow-1);
	}
	.done-badge svg {
		width: 18px;
		height: 18px;
	}
	.done-badge {
		animation: badge-pop 420ms var(--lb-ease-overshoot) both;
	}
	@keyframes badge-pop {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
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
		animation: word-in 360ms var(--lb-ease-overshoot) 120ms both;
		overflow-wrap: anywhere;
		font-size: var(--lb-text-sm);
		font-weight: 800;
		letter-spacing: 0.06em;
		color: var(--lb-ink);
	}
	.bucket[data-state='done'] {
		background: color-mix(in srgb, var(--bucket-color) 20%, var(--lb-paper));
		box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--bucket-color) 60%, transparent);
	}
	.bucket[data-state='done'] .word {
		color: var(--lb-leaf-dark);
	}
	@keyframes word-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
