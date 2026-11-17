<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		step: 1 | 2;
		onclose: () => void;
	}

	let { step, onclose }: Props = $props();
</script>

<!-- Step 2 renders inside the word panel's dialog (see WordPanel), so it
	drops the live-region role: it is interactive content in a modal, not a
	passive status message. Step 1 is text-only and keeps role="status". -->
<aside class="coach" class:top={step === 2} role={step === 1 ? 'status' : undefined}>
	<span class="bulb" aria-hidden="true"
		><svg viewBox="0 0 24 24"
			><path
				d="M9 18h6M10 21h4M8 14a5 5 0 1 1 8 0c-.8.8-1.2 1.8-1.2 3H9.2c0-1.2-.4-2.2-1.2-3z"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/></svg
		></span
	>
	<p>{step === 1 ? m.coach_bucket() : m.coach_tile()}</p>
	<button type="button" onclick={onclose}>{m.got_it()}</button>
</aside>

<style>
	.coach {
		position: fixed;
		left: 50%;
		bottom: max(var(--lb-safe-bottom), var(--lb-space-4));
		transform: translateX(-50%);
		z-index: 40;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--lb-space-2);
		width: min(94vw, 440px);
		padding: var(--lb-space-3);
		border-radius: var(--lb-radius);
		background: var(--lb-ink);
		color: var(--lb-paper);
		box-shadow: var(--lb-shadow-2);
	}
	.coach.top {
		top: max(var(--lb-safe-top), 76px);
		bottom: auto;
	}
	p {
		margin: 0;
		font-size: var(--lb-text-sm);
		font-weight: 700;
	}
	button {
		min-height: 44px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-gold);
		color: var(--lb-ink);
		font-weight: 800;
	}
	.bulb svg {
		width: 22px;
		height: 22px;
	}
</style>
