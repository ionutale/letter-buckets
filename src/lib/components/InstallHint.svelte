<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { Locale } from '#lib/content/schema.js';
	import { loadSave, persistSave } from '#lib/storage/save.js';

	let show = $state(false);

	onMount(() => {
		const data = loadSave(localStorage);
		const locale = getLocale() as Locale;
		const standalone = window.matchMedia('(display-mode: standalone)').matches;
		show =
			!standalone &&
			!data.settings.installHintDismissed &&
			data.locales[locale].clearedThrough >= 1;
	});

	function dismiss(): void {
		const data = loadSave(localStorage);
		data.settings.installHintDismissed = true;
		persistSave(data, localStorage);
		show = false;
	}
</script>

{#if show}
	<aside class="hint" role="status">
		<p>{m.install_hint()}</p>
		<button type="button" onclick={dismiss}>{m.dismiss()}</button>
	</aside>
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
		padding: var(--lb-space-3);
		border-radius: var(--lb-radius);
		background: var(--lb-sky-2);
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lb-sky) 60%, transparent);
	}
	p {
		flex: 1;
		margin: 0;
		font-size: var(--lb-text-sm);
		font-weight: 700;
	}
	button {
		min-height: 44px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper);
		font-weight: 800;
	}
</style>
