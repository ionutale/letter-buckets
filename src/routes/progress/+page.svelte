<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import type { Locale } from '#lib/content/schema.js';
	import {
		emptyChapterMetrics,
		loadSave,
		type ChapterMetrics,
		type SaveData
	} from '#lib/storage/save.js';

	let data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');

	onMount(() => {
		data = loadSave(localStorage);
		locale = getLocale() as Locale;
	});

	const metrics = $derived(data?.locales[locale].metrics ?? null);
	const attempts = $derived(metrics ? metrics.correctPlacements + metrics.wrongPlacements : 0);
	const hasProgress = $derived(!!metrics && (metrics.wordsCompleted > 0 || attempts > 0));
	const accuracy = $derived(
		metrics && attempts > 0 ? Math.round((metrics.correctPlacements / attempts) * 100) : 0
	);
	const chapters = $derived(
		[1, 2, 3, 4, 5].map((chapter) => ({
			chapter,
			metrics: metrics?.chapters[chapter] ?? emptyChapterMetrics()
		}))
	);

	function chapterAttempts(value: ChapterMetrics): number {
		return value.correctPlacements + value.wrongPlacements;
	}

	function chapterAccuracy(value: ChapterMetrics): number {
		const total = chapterAttempts(value);
		return total > 0 ? Math.round((value.correctPlacements / total) * 100) : 0;
	}
</script>

<svelte:head>
	<title>{m.progress()} — {m.app_name()}</title>
</svelte:head>

<main class="progress lb-safe">
	<header class="top">
		<a class="round" href={localizeHref('/')} aria-label={m.back()}>←</a>
		<h1>{m.progress()}</h1>
	</header>

	{#if metrics && hasProgress}
		<section class="summary" aria-label={m.progress()}>
			<article class="stat">
				<strong>{metrics.wordsCompleted}</strong>
				<span>{m.words_correct()}</span>
			</article>
			<article class="stat">
				<strong>{metrics.wordsFirstTry}</strong>
				<span>{m.words_first_try()}</span>
			</article>
			<article class="stat">
				<strong>{metrics.wordsWithMistakes}</strong>
				<span>{m.words_with_mistakes()}</span>
			</article>
			<article class="stat accent">
				<strong>{accuracy}%</strong>
				<span>{m.accuracy()}</span>
			</article>
		</section>

		<section class="letters" aria-label={m.letters()}>
			<p>
				<span>{m.correct_letters()}</span>
				<strong>{metrics.correctPlacements}</strong>
			</p>
			<p>
				<span>{m.wrong_letters()}</span>
				<strong>{metrics.wrongPlacements}</strong>
			</p>
		</section>

		<section class="chapters" aria-label={m.per_chapter()}>
			<h2>{m.per_chapter()}</h2>
			{#each chapters as item (item.chapter)}
				{@const stats = item.metrics}
				<article class="chapter" data-chapter={item.chapter}>
					<div class="chapter-head">
						<strong>{m.chapter_n({ n: item.chapter })}</strong>
						<b>{chapterAttempts(stats) > 0 ? `${chapterAccuracy(stats)}%` : '—'}</b>
					</div>
					<p class="chapter-stats">
						<span>{m.words_correct()}: <b>{stats.wordsCompleted}</b></span>
						<span>{m.words_first_try()}: <b>{stats.wordsFirstTry}</b></span>
						<span>{m.words_with_mistakes()}: <b>{stats.wordsWithMistakes}</b></span>
						<span>{m.correct_letters()}: <b>{stats.correctPlacements}</b></span>
						<span>{m.wrong_letters()}: <b>{stats.wrongPlacements}</b></span>
					</p>
				</article>
			{/each}
		</section>
	{:else}
		<p class="empty">{m.no_progress_yet()}</p>
	{/if}
</main>

<style>
	.progress {
		display: grid;
		align-content: start;
		gap: var(--lb-space-4);
	}
	.top {
		display: flex;
		align-items: center;
		gap: var(--lb-space-3);
	}
	h1 {
		font-size: var(--lb-text-xl);
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
	.summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lb-space-3);
	}
	.stat {
		display: grid;
		gap: 2px;
		padding: var(--lb-space-4);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
	.stat strong {
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-xl);
		line-height: 1;
	}
	.stat span {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-sm);
		font-weight: 700;
	}
	.stat.accent {
		background: color-mix(in srgb, var(--lb-leaf) 18%, var(--lb-paper));
	}
	.letters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lb-space-3);
	}
	.letters p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0;
		padding: var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper-2);
		font-weight: 800;
	}
	.letters span {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-sm);
	}
	.chapters {
		display: grid;
		gap: var(--lb-space-2);
	}
	.chapters h2 {
		font-size: var(--lb-text-md);
	}
	.chapter {
		display: grid;
		gap: var(--lb-space-2);
		padding: var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper-2);
	}
	.chapter-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lb-space-3);
	}
	.chapter-head b {
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-md);
	}
	.chapter-stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lb-space-1) var(--lb-space-3);
		margin: 0;
	}
	.chapter-stats span {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
	}
	.chapter-stats b {
		color: var(--lb-ink);
		font-variant-numeric: tabular-nums;
	}
	.empty {
		padding: var(--lb-space-5);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		color: var(--lb-ink-soft);
		font-weight: 700;
		text-align: center;
	}
</style>
