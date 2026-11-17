<script lang="ts">
	import SpeakerIcon from './SpeakerIcon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { audio } from '#lib/audio/index.js';
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
	<div class="complete" role="dialog" aria-modal="true" aria-label={m.level_complete()}>
		<h2>{final ? m.you_did_it() : m.level_complete()}</h2>
		{#if showStamp}
			<p class="stamp">{m.chapter_stamp({ n: stamp })} ★</p>
		{/if}
		<ul class="words">
			{#each session.buckets as bucket, index}
				<li>
					<button
						type="button"
						onclick={() =>
							audio.playWord(
								session.locale,
								session.level,
								index,
								session.packageId,
								session.voice
							)}
					>
						{bucket.word}
						<span class="speaker" aria-hidden="true"><SpeakerIcon /></span>
					</button>
				</li>
			{/each}
		</ul>
		<div class="actions">
			{#if final}
				<button type="button" class="primary" onclick={onwordbook}>{m.word_book()}</button>
			{:else}
				<button type="button" class="primary" onclick={onnext}>{m.next_level()}</button>
			{/if}
			<button type="button" class="secondary" onclick={onclose}>{m.back_to_levels()}</button>
		</div>
	</div>
{/if}

<style>
	.speaker {
		font-size: 0.85rem;
		opacity: 0.7;
	}
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
		padding: 0;
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper-2);
	}
	.words button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 44px;
		padding: var(--lb-space-2) var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		font-weight: 800;
		letter-spacing: 0.06em;
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
		background: var(--lb-ink);
		color: var(--lb-paper);
	}
	.secondary {
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
</style>
