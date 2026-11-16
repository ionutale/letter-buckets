<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import { getLevelContent, getWordArt } from '#lib/content/index.js';
	import type { Locale, PackageId } from '#lib/content/schema.js';
	import { audio } from '#lib/audio/index.js';
	import { loadSave, resolveActivePackage, wordKey, type SaveData } from '#lib/storage/save.js';
	import WordChip from '#lib/components/WordChip.svelte';

	let data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');
	let packageId = $state<PackageId>('p1');

	onMount(() => {
		locale = getLocale() as Locale;
		packageId = resolveActivePackage(localStorage, locale);
		data = loadSave(localStorage, packageId);
	});

	const unlocked = $derived(data ? data.locales[locale].unlocked : {});
	const count = $derived(Object.keys(unlocked).length);

	const chapters = $derived(
		packageId === 'p2'
			? [1, 2, 3, 4, 5].map((n) => ({ n, label: m.chapter_n({ n }) }))
			: [
					{ n: 1, label: m.chapter_home() },
					{ n: 2, label: m.chapter_farm() },
					{ n: 3, label: m.chapter_town() },
					{ n: 4, label: m.chapter_nature() },
					{ n: 5, label: m.chapter_world() }
				]
	);

	function audioPath(level: number, index: number): string {
		const folder = packageId === 'p2' ? '/audio/p2/words' : '/audio/words';
		return `${folder}/${locale}/l${String(level).padStart(2, '0')}-w${index + 1}.mp3`;
	}

	function play(level: number, index: number): void {
		audio.playWord(locale, level, index, packageId);
	}
</script>

<svelte:head>
	<title>{m.word_book()} — {m.app_name()}</title>
</svelte:head>

<main class="book lb-safe">
	<header class="top">
		<a class="round" href={localizeHref('/')} aria-label={m.back()}>←</a>
		<div>
			<h1>{m.word_book()}</h1>
			<p>{m.words_unlocked({ done: count })}</p>
		</div>
	</header>

	{#each chapters as chapter}
		<section class="chapter" aria-labelledby={`chapter-${chapter.n}`}>
			<h2 id={`chapter-${chapter.n}`}>{chapter.label}</h2>
			{#each Array.from({ length: 10 }, (_, index) => (chapter.n - 1) * 10 + index + 1) as level}
				<div class="level-row">
					<span class="level-num">{level}</span>
					<div class="chips">
						{#each getLevelContent(locale, level, packageId).words as entry, index}
							<WordChip
								word={entry.word}
								{level}
								image={getWordArt(locale, level, index, packageId)}
								unlocked={unlocked[wordKey(level, index)] === true}
								audio={audioPath(level, index)}
								onplay={() => play(level, index)}
							/>
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{/each}
</main>

<style>
	.book {
		display: grid;
		align-content: start;
		gap: var(--lb-space-5);
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
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
	.top p {
		margin: 0;
		color: var(--lb-ink-soft);
		font-weight: 700;
	}
	.chapter {
		display: grid;
		gap: var(--lb-space-2);
	}
	h2 {
		font-size: var(--lb-text-md);
		color: var(--lb-ink-soft);
	}
	.level-row {
		display: grid;
		grid-template-columns: 28px 1fr;
		align-items: center;
		gap: var(--lb-space-2);
	}
	.level-num {
		font-size: var(--lb-text-xs);
		font-weight: 800;
		color: var(--lb-ink-soft);
		text-align: right;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lb-space-2);
	}
</style>
