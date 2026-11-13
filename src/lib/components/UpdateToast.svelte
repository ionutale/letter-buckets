<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { applyUpdate, onUpdateReady } from '#lib/pwa/client.js';

	let ready = $state(false);

	onMount(() => onUpdateReady(() => (ready = true)));
</script>

{#if ready}
	<aside class="update" role="status">
		<p>{m.update_ready()}</p>
		<button type="button" onclick={applyUpdate}>{m.update_now()}</button>
	</aside>
{/if}

<style>
	.update {
		position: fixed;
		left: 50%;
		top: max(var(--lb-safe-top), var(--lb-space-3));
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
		padding: var(--lb-space-2) var(--lb-space-3);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-ink);
		color: var(--lb-paper);
		box-shadow: var(--lb-shadow-2);
	}
	p {
		margin: 0;
		font-size: var(--lb-text-sm);
		font-weight: 700;
	}
	button {
		min-height: 36px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-gold);
		color: var(--lb-ink);
		font-weight: 800;
	}
</style>
