<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import { getLevelContent } from '#lib/content/index.js';
	import type { Locale } from '#lib/content/schema.js';
	import { currentLevel, loadSave, type SaveData } from '#lib/storage/save.js';
	import ChapterTabs from '#lib/components/ChapterTabs.svelte';

	let data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');
	let active = $state(1);
	let toast = $state('');
	let toastTimer: number | null = null;

	onMount(() => {
		data = loadSave(localStorage);
		locale = getLocale() as Locale;
		active = Math.ceil(currentLevel(data, locale) / 10);
		active = Math.min(5, Math.max(1, active));
		if (page.url.searchParams.get('locked') === '1') {
			toast = m.level_locked_in_language();
			toastTimer = window.setTimeout(() => {
				toast = '';
				toastTimer = null;
			}, 2600);
		}
	});

	onDestroy(() => {
		if (toastTimer !== null) window.clearTimeout(toastTimer);
	});

	const current = $derived(data ? currentLevel(data, locale) : 1);
	const start = $derived((active - 1) * 10 + 1);
	const levels = $derived(Array.from({ length: 10 }, (_, index) => start + index));
	const stamps = $derived(data ? data.locales[locale].chapterStamps : []);

	function stateFor(level: number): 'done' | 'current' | 'locked' {
		if (!data) return 'locked';
		if (level <= data.locales[locale].clearedThrough) return 'done';
		if (level === current) return 'current';
		return 'locked';
	}

	function open(level: number): void {
		if (!data) return;
		const state = stateFor(level);
		if (state === 'locked') {
			toast = m.finish_level_first({ n: Math.max(1, level - 1) });
			if (toastTimer !== null) window.clearTimeout(toastTimer);
			toastTimer = window.setTimeout(() => {
				toast = '';
				toastTimer = null;
			}, 2600);
			return;
		}
		void goto(localizeHref(`/levels/${level}`));
	}
</script>

<svelte:head>
	<title>{m.levels()} — {m.app_name()}</title>
</svelte:head>

<main class="map lb-safe">
	<header class="top">
		<a class="round" href={localizeHref('/')} aria-label={m.back()}>←</a>
		<h1>{m.levels()}</h1>
	</header>

	<ChapterTabs {active} {stamps} onselect={(chapter) => (active = chapter)} />

	<div class="grid">
		{#each levels as level}
			{@const state = stateFor(level)}
			{@const content = data ? getLevelContent(locale, level) : null}
			<button
				type="button"
				class="level"
				class:done={state === 'done'}
				class:current={state === 'current'}
				class:locked={state === 'locked'}
				data-state={state}
				aria-label={`${m.level_number({ n: level })}, ${state}`}
				onclick={() => open(level)}
			>
				<span class="num">{level}</span>
				<span class="theme">{content?.theme ?? ''}</span>
				{#if state === 'done'}<span class="mark" aria-hidden="true">★</span>{/if}
				{#if state === 'locked'}<span class="mark" aria-hidden="true">🔒</span>{/if}
			</button>
		{/each}
	</div>

	{#if toast}
		<p class="toast" role="status">{toast}</p>
	{/if}
</main>

<style>
	.map {
		display: grid;
		align-content: start;
		gap: var(--lb-space-4);
		min-height: 100dvh;
	}
	.top {
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
	}
	.round {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--lb-paper-2);
		color: var(--lb-ink);
		font-size: 1.4rem;
		text-decoration: none;
	}
	h1 {
		font-size: var(--lb-text-xl);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lb-space-3);
	}
	.level {
		position: relative;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 2px;
		min-height: 92px;
		padding: var(--lb-space-2);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		color: var(--lb-ink);
	}
	.level.done {
		background: color-mix(in srgb, var(--lb-leaf) 18%, var(--lb-paper));
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lb-leaf) 45%, transparent);
	}
	.level.current {
		background: var(--lb-paper);
		box-shadow:
			inset 0 0 0 3px var(--lb-ochre),
			var(--lb-shadow-1);
	}
	.level.locked {
		background: var(--lb-paper-2);
		color: var(--lb-ink-soft);
	}
	.num {
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-lg);
		font-weight: 800;
	}
	.theme {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-size: var(--lb-text-xs);
		color: var(--lb-ink-soft);
	}
	.mark {
		position: absolute;
		top: 6px;
		right: 8px;
		font-size: 0.9rem;
	}
	.toast {
		position: fixed;
		left: 50%;
		bottom: max(var(--lb-safe-bottom), var(--lb-space-4));
		transform: translateX(-50%);
		margin: 0;
		padding: var(--lb-space-3) var(--lb-space-4);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-ink);
		color: var(--lb-paper);
		font-size: var(--lb-text-sm);
		font-weight: 700;
		box-shadow: var(--lb-shadow-2);
	}
</style>
