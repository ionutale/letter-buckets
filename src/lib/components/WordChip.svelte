<script lang="ts">
	import SpeakerIcon from './SpeakerIcon.svelte';
	interface Props {
		word: string;
		level: number;
		image?: string;
		unlocked: boolean;
		audio?: string;
		onplay?: () => void;
	}

	let { word, level, image, unlocked, audio, onplay }: Props = $props();
	let imageBroken = $state(false);
</script>

{#if unlocked}
	<button
		type="button"
		class="chip unlocked"
		data-audio={audio}
		aria-label={`Hear ${word}`}
		onclick={onplay}
	>
		{#if image && !imageBroken}<img
				class="thumb"
				src={image}
				alt=""
				loading="lazy"
				decoding="async"
				onerror={() => (imageBroken = true)}
			/>{/if}
		<span class="word">{word}</span>
		<span class="icon" aria-hidden="true"><SpeakerIcon /></span>
	</button>
{:else}
	<span class="chip locked" aria-label={`Word locked, level ${level}`}>?</span>
{/if}

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-width: 76px;
		min-height: 44px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		font-weight: 800;
		letter-spacing: 0.06em;
	}
	.chip.unlocked {
		background: var(--lb-paper);
		box-shadow:
			inset 0 0 0 2px var(--lb-border),
			0 3px 0 var(--lb-border);
		color: var(--lb-ink);
	}
	.chip.unlocked:active {
		transform: translateY(2px);
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
	.chip.locked {
		background: color-mix(in srgb, var(--lb-paper-2) 55%, transparent);
		border: 2px dashed color-mix(in srgb, var(--lb-ink-soft) 30%, transparent);
		color: var(--lb-ink-soft);
	}
	.icon {
		font-size: 0.8rem;
		opacity: 0.7;
	}
	.thumb {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		object-fit: cover;
		background: var(--lb-paper-2);
	}
</style>
