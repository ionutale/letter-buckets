<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import type { Locale } from '#lib/content/schema.js';
	import { currentLevel, loadSave, type SaveData } from '#lib/storage/save.js';
	import InstallHint from '#lib/components/InstallHint.svelte';

	let data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');

	onMount(() => {
		data = loadSave(localStorage);
		locale = getLocale() as Locale;
	});

	const level = $derived(data ? currentLevel(data, locale) : 1);
	const words = $derived(data ? Object.keys(data.locales[locale].unlocked).length : 0);
	const stamps = $derived(data ? data.locales[locale].chapterStamps : []);
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<main class="home lb-safe">
	<header class="top">
		<span class="brand">{m.app_name()}</span>
		<a class="round" href={localizeHref('/settings')} aria-label={m.settings()}>⚙</a>
	</header>

	<div class="hero" aria-hidden="true">
		<span class="tile">L</span>
		<span class="bucket"></span>
	</div>
	<h1>{m.tagline()}</h1>

	<a class="play" href={localizeHref(`/levels/${level}`)}>{m.play()}</a>

	<div class="actions">
		<a href={localizeHref('/levels')}>{m.levels()}</a>
		<a href={localizeHref('/words')}>
			{m.word_book()}
			<small>{m.words_unlocked({ done: words })}</small>
		</a>
		<a href={localizeHref('/progress')}>{m.progress()}</a>
	</div>

	<div class="stamps" aria-hidden="true">
		{#each [1, 2, 3, 4, 5] as chapter}
			<span class:filled={stamps.includes(chapter)}>★</span>
		{/each}
	</div>

	<InstallHint />
</main>

<style>
	.home {
		display: grid;
		align-content: start;
		justify-items: center;
		gap: var(--lb-space-4);
		min-height: 100dvh;
		text-align: center;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}
	.brand {
		font-family: var(--lb-font-display);
		font-weight: 800;
		color: var(--lb-ink-soft);
	}
	.round {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--lb-paper-2);
		color: var(--lb-ink);
		font-size: 1.2rem;
		text-decoration: none;
	}
	.hero {
		position: relative;
		width: 140px;
		height: 150px;
		margin-top: var(--lb-space-4);
	}
	.tile {
		position: absolute;
		top: 0;
		left: 50%;
		width: 84px;
		height: 84px;
		transform: translateX(-50%) rotate(-4deg);
		display: grid;
		place-items: center;
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow:
			0 6px 0 var(--lb-border),
			var(--lb-shadow-1);
		font-family: var(--lb-font-display);
		font-size: 3rem;
		font-weight: 800;
		color: var(--lb-ink);
	}
	.bucket {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 118px;
		height: 84px;
		transform: translateX(-50%);
		border-radius: 14px 14px 26px 26px;
		background: var(--lb-leaf);
		box-shadow:
			inset 0 8px 0 rgba(255, 255, 255, 0.18),
			var(--lb-shadow-2);
	}
	h1 {
		max-width: 22ch;
		font-size: var(--lb-text-lg);
		line-height: 1.2;
		color: var(--lb-ink-soft);
	}
	.play {
		display: inline-grid;
		place-items: center;
		min-width: 220px;
		min-height: 56px;
		padding: 0 var(--lb-space-6);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-ochre-deep);
		box-shadow: 0 5px 0 #6f360b;
		color: #fff;
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-lg);
		font-weight: 800;
		text-decoration: none;
	}
	.play:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 #6f360b;
	}
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lb-space-3);
		width: 100%;
		max-width: 420px;
	}
	.actions a {
		display: grid;
		justify-items: center;
		gap: 2px;
		min-height: 64px;
		padding: var(--lb-space-2);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		color: var(--lb-ink);
		font-weight: 800;
		text-decoration: none;
	}
	.actions small {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 600;
	}
	.stamps {
		display: flex;
		gap: var(--lb-space-2);
		margin-top: var(--lb-space-2);
		color: var(--lb-border);
		font-size: 1.5rem;
	}
	.stamps .filled {
		color: var(--lb-gold);
	}
</style>
