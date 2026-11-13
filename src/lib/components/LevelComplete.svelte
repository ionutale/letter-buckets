<script lang="ts">
	import type { LevelSession } from '#lib/game/session.svelte.js';

	interface Props {
		session: LevelSession;
		onnext?: () => void;
		onclose?: () => void;
	}

	let { session, onnext, onclose }: Props = $props();
</script>

{#if session.complete}
	<div class="complete" role="dialog" aria-modal="true" aria-label="Level complete">
		<h2>Level complete!</h2>
		<p>{session.buckets.map((bucket) => bucket.word).join(' · ')}</p>
		<div class="actions">
			<button type="button" class="primary" onclick={onnext}>Next level</button>
			<button type="button" class="secondary" onclick={onclose}>Back to levels</button>
		</div>
	</div>
{/if}

<style>
	.complete {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--lb-space-4);
		padding: var(--lb-space-5);
		text-align: center;
		background: color-mix(in srgb, var(--lb-paper) 92%, transparent);
		backdrop-filter: blur(4px);
	}
	h2 {
		font-size: var(--lb-text-xl);
	}
	p {
		margin: 0;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--lb-ink-soft);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--lb-space-3);
	}
	button {
		min-height: 48px;
		padding: 0 var(--lb-space-5);
		border-radius: var(--lb-radius-pill);
		font-weight: 800;
	}
	.primary {
		background: var(--lb-ochre);
		color: #fff;
	}
	.secondary {
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
</style>
