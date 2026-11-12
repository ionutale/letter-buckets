<script lang="ts">
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { initPwa } from '#lib/pwa/client.js';

	let { children } = $props();

	onMount(() => {
		try {
			document.documentElement.lang = getLocale();
		} catch {
			// Locale resolution failed: keep the app.html default.
		}
		initPwa();
	});
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

{@render children()}
