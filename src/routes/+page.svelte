<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';
	import { getLevelContent, getWordArt } from '#lib/content/index.js';
	import type { Locale, PackageId } from '#lib/content/schema.js';
	import {
		currentLevel,
		isPackageUnlocked,
		loadSave,
		persistSave,
		resolveActivePackage,
		type SaveData
	} from '#lib/storage/save.js';
	import InstallHint from '#lib/components/InstallHint.svelte';

	let data = $state<SaveData | null>(null);
	let mainData = $state<SaveData | null>(null);
	let package2Data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');
	let packageId = $state<PackageId>('p1');
	let broken = $state<Record<number, boolean>>({});

	onMount(() => {
		locale = getLocale() as Locale;
		mainData = loadSave(localStorage);
		package2Data = loadSave(localStorage, 'p2');
		packageId = resolveActivePackage(localStorage, locale);
		data = loadSave(localStorage, packageId);
	});

	function selectPackage(next: PackageId): void {
		if (!mainData || next === packageId) return;
		if (next === 'p2' && !isPackageUnlocked(mainData, locale, 'p2')) return;
		if (next === 'p3' && (!package2Data || !isPackageUnlocked(package2Data, locale, 'p3'))) return;
		packageId = next;
		mainData.settings.activePackage = next;
		persistSave(mainData, localStorage);
		data = loadSave(localStorage, next);
	}

	const level = $derived(data ? currentLevel(data, locale) : 1);
	const chapter = $derived(Math.ceil(level / 10));
	const words = $derived(data ? Object.keys(data.locales[locale].unlocked).length : 0);
	const stamps = $derived(data ? data.locales[locale].chapterStamps : []);
	const metrics = $derived(data?.locales[locale].metrics ?? null);
	const attempts = $derived(metrics ? metrics.correctPlacements + metrics.wrongPlacements : 0);
	const accuracy = $derived(
		metrics && attempts > 0 ? Math.round((metrics.correctPlacements / attempts) * 100) : 0
	);
	const theme = $derived(getLevelContent(locale, level, packageId).theme);
	const mode = $derived(
		mainData?.settings.mode === 'medium'
			? m.mode_medium()
			: mainData?.settings.mode === 'hard'
				? m.mode_hard()
				: m.mode_easy()
	);

	const p2Locked = $derived(!mainData || !isPackageUnlocked(mainData, locale, 'p2'));
	const p3Locked = $derived(!package2Data || !isPackageUnlocked(package2Data, locale, 'p3'));

	function hideImage(index: number): void {
		broken = { ...broken, [index]: true };
	}
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<main class="home lb-safe">
	<header class="top">
		<span class="brand">{m.app_name()}</span>
		<div class="top-actions">
			<a class="lang" href={localizeHref('/settings')} aria-label={m.language()}>
				{locale.toUpperCase()}
			</a>
			<a class="round" href={localizeHref('/settings')} aria-label={m.settings()}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
					/>
					<path
						d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.4-2-3.4-2.3 1a8 8 0 0 0-2.6-1.5L14.2 2h-4.4l-.3 3.2A8 8 0 0 0 6.9 6.7l-2.3-1-2 3.4 2 1.4a7.6 7.6 0 0 0 0 3l-2 1.4 2 3.4 2.3-1a8 8 0 0 0 2.6 1.5l.3 3.2h4.4l.3-3.2a8 8 0 0 0 2.6-1.5l2.3 1 2-3.4z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
		</div>
	</header>

	<section class="cover" aria-labelledby="home-title">
		<div class="stage" aria-hidden="true">
			<span class="arch"></span>
			<div class="fanned">
				{#each [0, 1, 2] as index (index)}
					<span class="word-card" style={`--i:${index}`}>
						{#if !broken[index]}
							<img
								src={getWordArt(locale, level, index, packageId)}
								alt=""
								loading="eager"
								decoding="async"
								onerror={() => hideImage(index)}
							/>
						{/if}
					</span>
				{/each}
			</div>
			<svg class="bucket" viewBox="0 0 200 160" role="presentation">
				<path
					class="handle"
					d="M48 60c0-37 22-52 52-52s52 15 52 52"
					fill="none"
					stroke-width="9"
					stroke-linecap="round"
				/>
				<path class="body" d="M24 60h152l-13 80c-2 11-11 18-22 18H59c-11 0-20-7-22-18z" />
				<rect class="rim" x="17" y="52" width="166" height="20" rx="10" />
				<path class="shine" d="M42 70h14l-7 66h-9z" />
			</svg>
		</div>

		<h1 id="home-title">{m.tagline()}</h1>

		<a class="play" href={localizeHref(`/levels/${level}`)}>
			<span class="play-title">{m.play()}</span>
			<span class="play-sub">{m.level_number({ n: level })} · {theme}</span>
		</a>

		<div class="status-line">
			<span class="stars" aria-hidden="true">
				{#each [1, 2, 3, 4, 5] as stamp}
					<svg viewBox="0 0 24 24" class:filled={stamps.includes(stamp)}>
						<path d="M12 3.6l2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8z" />
					</svg>
				{/each}
			</span>
			<span class="chapter-copy">{m.chapter_n({ n: chapter })}</span>
			<span class="mode-chip">{mode}</span>
		</div>
		<div class="package-switch" role="group" aria-label={m.packages()}>
			<button
				type="button"
				class:active={packageId === 'p1'}
				aria-pressed={packageId === 'p1'}
				onclick={() => selectPackage('p1')}
			>
				{m.package_1()}
			</button>
			<button
				type="button"
				class:active={packageId === 'p2'}
				aria-pressed={packageId === 'p2'}
				aria-disabled={p2Locked}
				aria-label={p2Locked ? `${m.package_2()}, ${m.package_locked()}` : undefined}
				title={p2Locked ? m.package_locked() : ''}
				onclick={() => selectPackage('p2')}
			>
				{#if mainData && !isPackageUnlocked(mainData, locale, 'p2')}<svg
						class="lock"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><rect
							x="5"
							y="10"
							width="14"
							height="10"
							rx="2"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						/><path
							d="M8 10V7a4 4 0 0 1 8 0v3"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/></svg
					>{/if}
				{m.package_2()}
			</button>
			<button
				type="button"
				class:active={packageId === 'p3'}
				aria-pressed={packageId === 'p3'}
				aria-disabled={p3Locked}
				aria-label={p3Locked ? `${m.package_3()}, ${m.package_3_locked()}` : undefined}
				title={p3Locked ? m.package_3_locked() : ''}
				onclick={() => selectPackage('p3')}
			>
				{#if package2Data && !isPackageUnlocked(package2Data, locale, 'p3')}<svg
						class="lock"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><rect
							x="5"
							y="10"
							width="14"
							height="10"
							rx="2"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						/><path
							d="M8 10V7a4 4 0 0 1 8 0v3"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/></svg
					>{/if}
				{m.package_3()}
			</button>
		</div>
	</section>

	<footer class="bottom">
		<nav class="shelf" aria-label={m.levels()}>
			<a href={localizeHref('/levels')}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
					/>
				</svg>
				<span>
					<strong>{m.levels()}</strong>
					<small>{m.level_number({ n: level })}</small>
				</span>
			</a>
			<a href={localizeHref('/words')}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM18 7h1a2 2 0 0 1 2 2v11h-3"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linejoin="round"
					/>
				</svg>
				<span>
					<strong>{m.word_book()}</strong>
					<small>{m.words_unlocked({ done: words })}</small>
				</span>
			</a>
			<a href={localizeHref('/progress')}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M4 19V9M10 19V5M16 19v-7M22 19H2"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
				<span>
					<strong>{m.progress()}</strong>
					<small>{m.accuracy()} {accuracy}%</small>
				</span>
			</a>
		</nav>
		<InstallHint />
	</footer>
</main>

<style>
	.home {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: var(--lb-space-4);
		min-height: 100dvh;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lb-space-3);
	}
	.brand {
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-md);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--lb-ink-soft);
	}
	.top-actions {
		display: flex;
		align-items: center;
		gap: var(--lb-space-2);
	}
	.lang,
	.round {
		display: grid;
		place-items: center;
		min-width: 48px;
		height: 48px;
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper-2);
		color: var(--lb-ink);
		text-decoration: none;
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
	.lang {
		padding-inline: var(--lb-space-3);
		font-size: var(--lb-text-sm);
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.round svg {
		width: 22px;
		height: 22px;
	}
	.cover {
		display: grid;
		align-self: center;
		justify-items: center;
		gap: var(--lb-space-3);
		text-align: center;
	}
	.stage {
		position: relative;
		width: min(400px, 82vw);
		aspect-ratio: 1.3;
		margin-bottom: var(--lb-space-2);
	}
	.arch {
		position: absolute;
		inset: 2% 4% 15%;
		border-radius: 48% 48% 14% 14%;
		background: color-mix(in srgb, var(--lb-ochre) 10%, var(--lb-paper-2));
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lb-ochre) 18%, transparent);
	}
	.fanned {
		position: absolute;
		inset: 8% 0 auto;
		height: 54%;
	}
	.word-card {
		--tx: -50%;
		--rot: 0deg;
		position: absolute;
		top: 0;
		left: 50%;
		width: 35%;
		aspect-ratio: 1;
		padding: 5px;
		border-radius: var(--lb-radius);
		background: var(--lb-paper);
		box-shadow:
			0 3px 0 var(--lb-border),
			var(--lb-shadow-1);
		transform: translateX(var(--tx)) rotate(var(--rot));
		transform-origin: 50% 100%;
		animation: card-in 620ms var(--lb-ease-overshoot) both;
		animation-delay: calc(var(--i) * 90ms);
	}
	.word-card:nth-child(1) {
		--tx: -112%;
		--rot: -10deg;
		z-index: 1;
	}
	.word-card:nth-child(2) {
		z-index: 3;
	}
	.word-card:nth-child(3) {
		--tx: 12%;
		--rot: 10deg;
		z-index: 2;
	}
	.word-card img {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: calc(var(--lb-radius) - 5px);
		object-fit: cover;
		background: var(--lb-paper-2);
	}
	.bucket {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 66%;
		transform: translateX(-50%);
		z-index: 4;
		filter: drop-shadow(0 7px 0 color-mix(in srgb, var(--lb-leaf-dark) 22%, transparent));
		animation: float 5.5s ease-in-out 1.4s infinite;
	}
	.handle {
		stroke: var(--lb-leaf-dark);
	}
	.body {
		fill: var(--lb-leaf);
	}
	.rim {
		fill: var(--lb-leaf-dark);
	}
	.shine {
		fill: color-mix(in srgb, #fff 22%, transparent);
	}
	h1 {
		max-width: 22ch;
		font-size: var(--lb-text-lg);
		line-height: 1.15;
		letter-spacing: -0.02em;
		color: var(--lb-ink-soft);
	}
	.play {
		display: grid;
		gap: 1px;
		min-width: min(300px, 82vw);
		min-height: 70px;
		padding: var(--lb-space-2) var(--lb-space-6);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-ochre-deep);
		box-shadow: 0 5px 0 #6f360b;
		color: #fff;
		text-decoration: none;
		transition:
			transform var(--lb-t-fast) var(--lb-ease),
			box-shadow var(--lb-t-fast) var(--lb-ease);
	}
	.play:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 0 #6f360b;
	}
	.play:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 #6f360b;
	}
	.play-title {
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-lg);
		font-weight: 800;
		line-height: 1;
	}
	.play-sub {
		font-size: var(--lb-text-xs);
		font-weight: 700;
		opacity: 0.9;
	}
	.status-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--lb-space-2);
		min-height: 32px;
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 700;
	}
	.stars {
		display: flex;
		gap: 2px;
	}
	.stars svg {
		width: 20px;
		height: 20px;
		fill: var(--lb-border);
	}
	.stars svg.filled {
		fill: var(--lb-gold);
	}
	.chapter-copy {
		letter-spacing: 0.02em;
	}
	.mode-chip {
		padding: 3px 9px;
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 1px var(--lb-border);
	}
	.package-switch {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 1px var(--lb-border);
	}
	.package-switch button {
		min-height: 44px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-pill);
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 800;
	}
	.package-switch button.active {
		background: var(--lb-paper);
		color: var(--lb-ink);
		box-shadow: var(--lb-shadow-1);
	}
	.package-switch button[aria-disabled='true'] {
		opacity: 0.45;
	}
	.package-switch :global(.lock) {
		width: 13px;
		height: 13px;
		margin-right: 3px;
		vertical-align: -2px;
	}
	.bottom {
		display: grid;
		gap: var(--lb-space-3);
	}
	.shelf {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border-top: 2px solid var(--lb-border);
		padding-top: var(--lb-space-3);
	}
	.shelf a {
		display: flex;
		align-items: center;
		gap: var(--lb-space-2);
		min-height: 56px;
		padding: 0 var(--lb-space-2);
		color: var(--lb-ink);
		text-decoration: none;
	}
	.shelf a + a {
		border-left: 1px solid var(--lb-border);
	}
	.shelf a:hover {
		background: color-mix(in srgb, var(--lb-paper-2) 60%, transparent);
	}
	.shelf svg {
		flex: 0 0 auto;
		width: 24px;
		height: 24px;
		color: var(--lb-ink-soft);
	}
	.shelf span {
		display: grid;
		min-width: 0;
	}
	.shelf strong {
		overflow: hidden;
		font-size: var(--lb-text-sm);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.shelf small {
		overflow: hidden;
		color: var(--lb-ink-soft);
		font-size: 0.68rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateX(var(--tx)) translateY(14px) rotate(var(--rot)) scale(0.94);
		}
	}
	@keyframes float {
		0%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(-4px);
		}
	}
	@media (max-width: 620px) {
		.shelf {
			grid-template-columns: 1fr;
		}
		.shelf a + a {
			border-top: 1px solid var(--lb-border);
			border-left: 0;
		}
		.shelf small {
			white-space: normal;
		}
		.shelf a {
			min-height: 48px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.word-card,
		.bucket {
			animation: none;
		}
	}
</style>
