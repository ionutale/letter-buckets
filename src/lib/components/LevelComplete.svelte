<script lang="ts">
	import type { LevelSession } from '#lib/game/session.svelte.js';

	interface Props {
		session: LevelSession;
		onnext?: () => void;
		onclose?: () => void;
		onwordbook?: () => void;
	}

	let { session, onnext, onclose, onwordbook }: Props = $props();

	const final = $derived(session.level >= 50);
	const showStamp = $derived(session.level % 10 === 0);
	const stamp = $derived(Math.ceil(session.level / 10));
</script>

{#if session.complete}
	<div class="complete" role="dialog" aria-modal="true" aria-label="Level complete">
		<h2>{final ? 'You did it!' : 'Level complete!'}</h2>
		{#if showStamp}
			<p class="stamp">Chapter {stamp} ★</p>
		{/if}
		<ul class="words">
			{#each session.buckets as bucket}
				<li>{bucket.word}</li>
			{/each}
		</ul>
		<div class="actions">
			{#if final}
				<button type="button" class="primary" onclick={onwordbook}>Word Book</button>
			{:else}
				<button type="button" class="primary" onclick={onnext}>Next level</button>
			{/if}
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
	.stamp {
		padding: var(--lb-space-2) var(--lb-space-4);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-gold);
		color: var(--lb-ink);
	}
	.words {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--lb-space-3);
		margin: 0;
		padding: 0;
		list-style: none;
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.words li {
		padding: var(--lb-space-2) var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper-2);
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
