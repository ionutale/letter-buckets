<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import { getLevelArt, getWordArt } from '#lib/content/index.js';
	import type { Locale } from '#lib/content/schema.js';
	import { createLevelSession } from '#lib/game/session.svelte.js';
	import type { LevelSession } from '#lib/game/session.svelte.js';
	import { audio } from '#lib/audio/index.js';
	import {
		getLocaleProgress,
		hintsRemaining,
		isLevelOpen,
		loadSave,
		markWordComplete,
		persistSave,
		recordAttempt,
		resetLevelWords,
		spendHint,
		type GameMode,
		type SaveData
	} from '#lib/storage/save.js';
	import Bucket from '#lib/components/Bucket.svelte';
	import WordPanel from '#lib/components/WordPanel.svelte';
	import LevelComplete from '#lib/components/LevelComplete.svelte';
	import CoachMark from '#lib/components/CoachMark.svelte';

	let data = $state<SaveData | null>(null);
	let session = $state<LevelSession | null>(null);
	let locale = $state<Locale>('en');
	let artBroken = $state(false);
	let coachStep = $state<1 | 2 | null>(null);
	let muted = $state(false);
	let mode = $state<GameMode>('easy');

	const paramLevel = $derived(Number.parseInt(page.params.level ?? '', 10));
	const content = $derived(session?.content ?? null);
	const doneCount = $derived(
		session?.buckets.filter((bucket) => bucket.status === 'done').length ?? 0
	);
	const allDone = $derived(doneCount === 3);
	const hintsLeft = $derived(
		data ? hintsRemaining(data, locale, mode, paramLevel) : Number.POSITIVE_INFINITY
	);

	onMount(() => {
		data = loadSave(localStorage);
		locale = getLocale() as Locale;
		muted = data.settings.muted;
		mode = data.settings.mode;
		audio.setMuted(muted);
		audio.preloadLevel(locale, paramLevel);
		if (paramLevel === 1 && !data.settings.coachDone) coachStep = 1;
	});

	onDestroy(() => session?.closeWord());

	$effect(() => {
		if (coachStep === 1 && session?.openIndex != null) coachStep = 2;
	});

	$effect(() => {
		const level = paramLevel;
		if (!data) return;
		if (!Number.isInteger(level) || !isLevelOpen(data, locale, level)) {
			void goto(`${localizeHref('/levels')}?locked=1`);
			return;
		}
		if (session?.level === level) return;

		audio.preloadLevel(locale, level);
		session?.closeWord();
		session = createLevelSession(level, locale, {
			progress: getLocaleProgress(data, locale),
			onWordComplete: (completedLevel, wordIndex, firstTry) => {
				if (!data) return;
				markWordComplete(data, locale, completedLevel, wordIndex, firstTry);
				persistSave(data, localStorage);
			},
			onAttempt: (completedLevel, _wordIndex, correct) => {
				if (!data) return;
				recordAttempt(data, locale, completedLevel, correct);
				persistSave(data, localStorage);
			},
			canHint: () => hintsLeft > 0,
			onHintUsed: () => {
				if (!data) return;
				if (spendHint(data, locale, mode, paramLevel)) persistSave(data, localStorage);
			},
			onLevelComplete: () => {
				if (!data) return;
				audio.playSfx('level-complete');
				persistSave(data, localStorage);
			}
		});
	});

	function hideArt(event: Event): void {
		artBroken = true;
		(event.currentTarget as HTMLImageElement).style.display = 'none';
	}

	function playAgain(): void {
		if (!data || !session) return;
		audio.playSfx('ui-tap');
		resetLevelWords(data, locale, paramLevel);
		persistSave(data, localStorage);
		session.reset();
	}

	function dismissCoach(): void {
		if (!data) return;
		data.settings.coachDone = true;
		persistSave(data, localStorage);
		coachStep = null;
	}

	function openBucket(index: number): void {
		if (!session) return;
		audio.playSfx('bucket-open');
		session.openBucket(index);
	}

	function nextLevel(): void {
		void goto(localizeHref(paramLevel >= 50 ? '/levels' : `/levels/${paramLevel + 1}`));
	}

	function toggleMute(): void {
		if (!data) return;
		muted = !muted;
		data.settings.muted = muted;
		audio.setMuted(muted);
		persistSave(data, localStorage);
	}
</script>

<svelte:head>
	<title>{content ? `${content.theme} — ${m.app_name()}` : m.app_name()}</title>
</svelte:head>

<main class="level lb-safe">
	<header class="level-head">
		<a class="round" href={localizeHref('/levels')} aria-label={m.back()}>←</a>
		<div class="titles">
			<p>{m.level_number({ n: paramLevel })}</p>
			<h1>{content?.theme ?? ''}</h1>
		</div>
		<span class="count">{doneCount}/3</span>
		<button
			type="button"
			class="round mute"
			aria-label={m.sound()}
			aria-pressed={!muted}
			onclick={toggleMute}
		>
			{#if muted}
				<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"
					><path
						d="M4 9h4l5-4v14l-5-4H4z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/><path
						d="M16 9l5 6M21 9l-5 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/></svg
				>
			{:else}
				<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"
					><path
						d="M4 9h4l5-4v14l-5-4H4z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/><path
						d="M16 8a5 5 0 0 1 0 8"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/></svg
				>
			{/if}
		</button>
	</header>

	{#if !artBroken}
		<img
			class="banner"
			src={getLevelArt(paramLevel)}
			alt=""
			loading="lazy"
			decoding="async"
			onerror={hideArt}
		/>
	{/if}

	{#if session}
		<div class="buckets" aria-label="Words">
			{#each session.buckets as bucket (bucket.index)}
				<Bucket
					index={bucket.index + 1}
					status={bucket.status}
					word={bucket.word}
					image={getWordArt(locale, paramLevel, bucket.index)}
					onclick={() => openBucket(bucket.index)}
				/>
			{/each}
		</div>

		{#if allDone && !session.complete}
			<button type="button" class="again" onclick={playAgain}>{m.play()}</button>
		{/if}
	{:else}
		<p class="loading">…</p>
	{/if}

	{#if session && session.openIndex !== null}
		<WordPanel {session} {hintsLeft} onclose={() => session?.closeWord()} />
	{/if}

	{#if session && session.complete && session.openIndex === null}
		<LevelComplete
			{session}
			onnext={nextLevel}
			onclose={() => goto(localizeHref('/levels'))}
			onwordbook={() => goto(localizeHref('/words'))}
		/>
	{/if}

	{#if coachStep !== null}
		<CoachMark step={coachStep} onclose={dismissCoach} />
	{/if}
</main>

<style>
	.level {
		display: grid;
		gap: var(--lb-space-4);
		min-height: 100dvh;
		align-content: start;
	}
	.level-head {
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
	.mute .glyph {
		width: 20px;
		height: 20px;
	}
	.titles {
		min-width: 0;
		flex: 1;
	}
	.titles p {
		margin: 0;
		font-size: var(--lb-text-xs);
		font-weight: 700;
		color: var(--lb-ink-soft);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	h1 {
		font-size: clamp(1.3rem, 5vw, 1.7rem);
		overflow-wrap: anywhere;
	}
	.count {
		font-weight: 800;
		color: var(--lb-ink-soft);
	}
	.banner {
		width: 100%;
		aspect-ratio: 16 / 9;
		max-height: min(42vh, 360px);
		object-fit: cover;
		border-radius: var(--lb-radius);
		background: var(--lb-paper-3);
		box-shadow: var(--lb-shadow-1);
	}
	.buckets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lb-space-2);
	}
	.again {
		justify-self: center;
		min-height: 48px;
		padding: 0 var(--lb-space-5);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		font-weight: 800;
	}
	.loading {
		text-align: center;
		color: var(--lb-ink-soft);
	}
</style>
