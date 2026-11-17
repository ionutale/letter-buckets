<script lang="ts">
	import { untrack } from 'svelte';
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

	let dialogEl = $state<HTMLDivElement | null>(null);
	let previousFocus: HTMLElement | null = null;

	const final = $derived(session.level >= 50);
	const showStamp = $derived(session.level % 10 === 0);
	const stamp = $derived(Math.ceil(session.level / 10));

	// Move focus into the dialog while it is open and give it back when it
	// closes, so keyboard and screen-reader users are told the level ended
	// instead of tabbing onto the obscured level behind the overlay.
	$effect(() => {
		if (!session.complete) return;
		previousFocus = document.activeElement as HTMLElement | null;
		// Read the bound node without subscribing to it: the effect must only
		// re-run when `complete` changes, not when `bind:this` assigns the node.
		untrack(() => dialogEl)?.focus();
		return () => {
			if (previousFocus && previousFocus.isConnected) previousFocus.focus();
			previousFocus = null;
		};
	});

	function onDialogKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose?.();
			return;
		}
		if (event.key !== 'Tab' || !dialogEl) return;
		const focusables = [...dialogEl.querySelectorAll<HTMLElement>('button:not([disabled])')];
		if (focusables.length === 0) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		// Focus can fall out of the dialog when a control is disabled or
		// re-rendered: pull it back instead of letting it escape the overlay.
		if (!dialogEl.contains(document.activeElement)) {
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
		} else if (document.activeElement === dialogEl) {
			// The dialog itself holds focus on open; Shift+Tab from there would
			// otherwise move to the obscured page behind it.
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
		} else if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

{#if session.complete}
	<div
		class="complete"
		role="dialog"
		aria-modal="true"
		aria-label={m.level_complete()}
		tabindex="-1"
		bind:this={dialogEl}
		onkeydown={onDialogKeydown}
	>
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
