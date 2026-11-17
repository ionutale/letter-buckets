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
	import DownloadBar from '#lib/components/DownloadBar.svelte';
	import { ensureDownloads } from '#lib/pwa/downloads.svelte.js';

	let { children } = $props();

	onMount(() => {
		try {
			document.documentElement.lang = getLocale();
		} catch {
			// Locale resolution failed: keep the app.html default.
		}
		try {
			const settings = loadSave(localStorage).settings;
			audio.setVolumes(settings.volumes);
			audio.setMuted(settings.muted);
		} catch {
			// Private mode: the game still works, unmuted, for this session.
		}
		initPwa();
		// Level art, clues and clips stream in after the shell, starting at the
		// level the player is on.
		void ensureDownloads();
		const resume = (): void => void ensureDownloads();
		window.addEventListener('online', resume);
		const unlock = (): void => {
			audio.unlock();
		};
		window.addEventListener('pointerdown', unlock, { once: true });
		return () => {
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('online', resume);
		};
	});
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<DownloadBar />
{@render children()}
<UpdateToast />
