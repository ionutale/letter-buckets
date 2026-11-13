<script lang="ts">
	import type { LevelSession } from '#lib/game/session.svelte.js';

	interface Props {
		session: LevelSession;
		onclose: () => void;
	}

	let { session, onclose }: Props = $props();
</script>

{#if session.openIndex !== null && session.word}
	<div class="panel" role="dialog" aria-modal="true" aria-label={`Word ${session.openIndex + 1} of 3`}>
		<header class="panel-head">
			<button type="button" class="icon" aria-label="Close" onclick={onclose}>×</button>
			<p>Word {session.openIndex + 1} of 3</p>
		</header>
		<p class="word">{session.word.spec.word}</p>
		<button type="button" class="back" onclick={onclose}>Back to buckets</button>
	</div>
{/if}

<style>
	.panel {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		align-content: start;
		gap: var(--lb-space-5);
		padding: max(var(--lb-safe-top), var(--lb-space-4)) var(--lb-space-4)
			max(var(--lb-safe-bottom), var(--lb-space-4));
		background: var(--lb-paper);
	}
	.panel-head {
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
	}
	.panel-head p {
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
	.word {
		margin: 0;
		text-align: center;
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-xl);
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.back {
		justify-self: center;
		min-height: 48px;
		padding: 0 var(--lb-space-5);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-leaf);
		color: #fff;
		font-weight: 800;
	}
</style>
