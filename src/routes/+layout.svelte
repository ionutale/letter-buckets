<script lang="ts">
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { initPwa } from '#lib/pwa/client.js';
	import { audio } from '#lib/audio/index.js';
	import { loadSave } from '#lib/storage/save.js';
	import UpdateToast from '#lib/components/UpdateToast.svelte';

	let { children } = $props();

	onMount(() => {
		try {
			document.documentElement.lang = getLocale();
		} catch {
			// Locale resolution failed: keep the app.html default.
		}
		try {
			audio.setMuted(loadSave(localStorage).settings.muted);
		} catch {
			// Private mode: the game still works, unmuted, for this session.
		}
		initPwa();
		const unlock = (): void => {
			audio.unlock();
		};
		window.addEventListener('pointerdown', unlock, { once: true });
		return () => {
			window.removeEventListener('pointerdown', unlock);
		};
	});
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

{@render children()}
<UpdateToast />
