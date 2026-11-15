<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, localizeHref, locales, setLocale } from '#lib/paraglide/runtime.js';
	import type { Locale } from '#lib/content/schema.js';
	import { audio } from '#lib/audio/index.js';
	import {
		currentLevel,
		loadSave,
		persistSave,
		resetLocale,
		type GameMode,
		type SaveData,
		type VolumeSettings
	} from '#lib/storage/save.js';

	const LOCALE_NAMES: Record<Locale, string> = {
		ro: 'Română',
		it: 'Italiano',
		en: 'English',
		de: 'Deutsch',
		ru: 'Русский'
	};

	let data = $state<SaveData | null>(null);
	let locale = $state<Locale>('en');
	let muted = $state(false);
	let mode = $state<GameMode>('easy');
	let holdProgress = $state(0);
	let toast = $state('');
	let holdTimer: number | null = null;
	let toastTimer: number | null = null;

	const HOLD_MS = 3000;

	onMount(() => {
		data = loadSave(localStorage);
		locale = getLocale() as Locale;
		muted = data.settings.muted;
		mode = data.settings.mode;
		audio.setVolumes(data.settings.volumes);
		audio.setMuted(muted);
	});

	onDestroy(() => {
		stopHoldTimer();
		if (toastTimer !== null) window.clearTimeout(toastTimer);
	});

	function persist(): void {
		if (data) persistSave(data, localStorage);
	}

	function switchLanguage(target: Locale): void {
		if (target === locale) return;
		audio.playSfx('ui-tap');
		locale = target;
		setLocale(target);
		document.documentElement.lang = target;
		void goto(localizeHref('/settings', { locale: target }));
	}

	const modes = [
		{ id: 'easy' as const, label: m.mode_easy, desc: m.mode_easy_desc },
		{ id: 'medium' as const, label: m.mode_medium, desc: m.mode_medium_desc },
		{ id: 'hard' as const, label: m.mode_hard, desc: m.mode_hard_desc }
	];

	function setMode(next: GameMode): void {
		if (!data || next === mode) return;
		audio.playSfx('ui-tap');
		mode = next;
		data.settings.mode = next;
		persist();
	}

	const volumes = [
		{ id: 'music' as const, label: m.music },
		{ id: 'sfx' as const, label: m.sfx },
		{ id: 'voice' as const, label: m.voice }
	];

	function setVolume(channel: keyof VolumeSettings, percent: number): void {
		if (!data) return;
		const value = Math.min(100, Math.max(0, percent)) / 100;
		data.settings.volumes[channel] = value;
		audio.setVolume(channel, value);
		persist();
	}

	function toggleMute(): void {
		if (!data) return;
		muted = !muted;
		data.settings.muted = muted;
		audio.setMuted(muted);
		if (!muted) audio.playSfx('ui-tap');
		persist();
	}

	function goHome(): void {
		void goto(localizeHref('/'));
	}

	function showToast(message: string): void {
		toast = message;
		if (toastTimer !== null) window.clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => {
			toast = '';
			toastTimer = null;
		}, 2600);
	}

	function stopHoldTimer(): void {
		if (holdTimer !== null) {
			window.clearInterval(holdTimer);
			holdTimer = null;
		}
	}

	function cancelHold(): void {
		stopHoldTimer();
		// A completed reset keeps the bar full: the toast can slide under the
		// pointer and fire a leave event right as the hold finishes.
		if (holdProgress < 1) holdProgress = 0;
	}

	function completeHold(): void {
		stopHoldTimer();
		// Keep the bar full until the finger lifts so the reset does not look cancelled.
		holdProgress = 1;
		if (!data) return;
		resetLocale(data, locale);
		data.settings.coachDone = false;
		persist();
		showToast(m.reset_done());
	}

	function startHold(event: PointerEvent): void {
		if (!data) return;
		const element = event.currentTarget as HTMLElement;
		// Keep receiving the move/up events even if the finger drifts off the
		// button during the three-second press (common on iOS).
		element.setPointerCapture?.(event.pointerId);
		stopHoldTimer();
		holdProgress = 0;
		const started = Date.now();
		holdTimer = window.setInterval(() => {
			holdProgress = Math.min(1, (Date.now() - started) / HOLD_MS);
			if (holdProgress >= 1) completeHold();
		}, 50);
	}

	function endHold(event: PointerEvent): void {
		const element = event.currentTarget as HTMLElement;
		if (element.hasPointerCapture?.(event.pointerId)) {
			element.releasePointerCapture(event.pointerId);
		}
		cancelHold();
	}

	function howToPlay(): void {
		if (!data) return;
		data.settings.coachDone = false;
		persist();
		void goto(localizeHref(`/levels/${currentLevel(data, locale)}`));
	}
</script>

<svelte:head>
	<title>{m.settings()} — {m.app_name()}</title>
</svelte:head>

<main class="settings lb-safe">
	<header class="top">
		<a class="round" href={localizeHref('/')} aria-label={m.back()}>←</a>
		<h1>{m.settings()}</h1>
	</header>

	<section class="card" aria-label={m.language()}>
		<h2>{m.language()}</h2>
		<div class="lang-grid">
			{#each locales as target (target)}
				<button
					type="button"
					class="lang"
					class:selected={target === locale}
					aria-pressed={target === locale}
					onclick={() => switchLanguage(target as Locale)}
				>
					{LOCALE_NAMES[target as Locale]}
				</button>
			{/each}
		</div>
	</section>

	<section class="card" aria-label={m.mode()}>
		<h2>{m.mode()}</h2>
		<div class="mode-grid">
			{#each modes as item (item.id)}
				<button
					type="button"
					class="mode"
					class:selected={mode === item.id}
					aria-pressed={mode === item.id}
					onclick={() => setMode(item.id)}
				>
					<strong>{item.label()}</strong>
					<small>{item.desc()}</small>
				</button>
			{/each}
		</div>
		<p class="note">{m.hints_automatic_free()}</p>
	</section>

	<section class="card" aria-label={m.sound()}>
		<h2>{m.sound()}</h2>
		<button type="button" class="toggle" aria-pressed={!muted} onclick={toggleMute}>
			<span class="dot" class:on={!muted}></span>
			{muted ? m.off() : m.on()}
		</button>
		<div class="volumes">
			{#each volumes as item (item.id)}
				{@const percent = Math.round((data?.settings.volumes[item.id] ?? 1) * 100)}
				<label class="volume" for={`volume-${item.id}`}>
					<span>{item.label()}</span>
					<input
						id={`volume-${item.id}`}
						type="range"
						min="0"
						max="100"
						step="1"
						value={percent}
						aria-label={item.label()}
						oninput={(event) =>
							setVolume(item.id, Number((event.currentTarget as HTMLInputElement).value))}
					/>
					<output for={`volume-${item.id}`}>{percent}%</output>
				</label>
			{/each}
		</div>
	</section>

	<section class="card grown" aria-label={m.for_grownups()}>
		<h2>{m.for_grownups()}</h2>
		<p class="hint">{m.hold_to_reset()}</p>
		<button
			type="button"
			class="reset"
			onpointerdown={startHold}
			onpointerup={endHold}
			onpointerleave={cancelHold}
			onpointercancel={endHold}
			oncontextmenu={(event) => event.preventDefault()}
		>
			<span class="bar" style={`width:${Math.round(holdProgress * 100)}%`}></span>
			<span class="reset-label">{m.reset_progress()}</span>
		</button>
		<button type="button" class="link" onclick={howToPlay}>{m.how_to_play()}</button>
		<button type="button" class="link" onclick={goHome}>{m.back()}</button>
	</section>

	<section class="card about" aria-label={m.about()}>
		<h2>{m.about()}</h2>
		<p>{m.app_name()} · v0.1</p>
		<p>Nunito (OFL). Generated art and audio. No accounts, no analytics, no tracking.</p>
	</section>

	{#if toast}
		<p class="toast" role="status">{toast}</p>
	{/if}
</main>

<style>
	.settings {
		display: grid;
		align-content: start;
		gap: var(--lb-space-4);
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
	.card {
		display: grid;
		gap: var(--lb-space-3);
		padding: var(--lb-space-4);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow: inset 0 0 0 2px var(--lb-border);
	}
	h2 {
		font-size: var(--lb-text-md);
	}
	.lang-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lb-space-2);
	}
	.lang {
		min-height: 48px;
		padding: 0 var(--lb-space-3);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		font-weight: 800;
	}
	.lang.selected {
		background: var(--lb-paper);
		color: var(--lb-ink);
		box-shadow: inset 0 0 0 3px var(--lb-ochre);
	}
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--lb-space-2);
	}
	.mode {
		display: grid;
		gap: 2px;
		min-height: 64px;
		padding: var(--lb-space-2);
		border-radius: var(--lb-radius-sm);
		background: var(--lb-paper);
		box-shadow: inset 0 0 0 2px var(--lb-border);
		text-align: left;
	}
	.mode strong {
		font-size: var(--lb-text-sm);
	}
	.mode small {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		line-height: 1.25;
	}
	.mode.selected {
		box-shadow: inset 0 0 0 3px var(--lb-ochre);
	}
	@media (max-width: 430px) {
		.mode-grid {
			grid-template-columns: 1fr;
		}
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--lb-space-2);
		min-height: 48px;
		font-weight: 800;
	}
	.dot {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--lb-border);
	}
	.dot.on {
		background: var(--lb-leaf);
	}
	.volumes {
		display: grid;
		gap: var(--lb-space-1);
		margin-top: var(--lb-space-2);
	}
	.volume {
		display: grid;
		grid-template-columns: 88px minmax(0, 1fr) 46px;
		align-items: center;
		gap: var(--lb-space-2);
		min-height: 44px;
		font-size: var(--lb-text-sm);
		font-weight: 700;
	}
	.volume input[type='range'] {
		width: 100%;
		height: 44px;
		margin: 0;
		appearance: none;
		background: transparent;
		accent-color: var(--lb-ochre-deep);
	}
	.volume input[type='range']::-webkit-slider-runnable-track {
		height: 6px;
		border-radius: 3px;
		background: var(--lb-border);
	}
	.volume input[type='range']::-webkit-slider-thumb {
		width: 22px;
		height: 22px;
		margin-top: -8px;
		appearance: none;
		border-radius: 50%;
		background: var(--lb-ochre-deep);
		box-shadow: 0 2px 0 #6f360b;
	}
	.volume input[type='range']::-moz-range-track {
		height: 6px;
		border-radius: 3px;
		background: var(--lb-border);
	}
	.volume input[type='range']::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border: 0;
		border-radius: 50%;
		background: var(--lb-ochre-deep);
		box-shadow: 0 2px 0 #6f360b;
	}
	.volume output {
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.hint,
	.note,
	.grown p,
	.about p {
		margin: 0;
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-sm);
	}
	.reset {
		position: relative;
		overflow: hidden;
		min-height: 48px;
		border-radius: var(--lb-radius-pill);
		background: color-mix(in srgb, var(--lb-berry) 18%, var(--lb-paper));
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lb-berry) 35%, transparent);
		font-weight: 800;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}
	.bar {
		position: absolute;
		inset: 0 auto 0 0;
		background: color-mix(in srgb, var(--lb-berry) 35%, transparent);
		pointer-events: none;
	}
	.reset-label {
		position: relative;
	}
	.link {
		justify-self: start;
		min-height: 44px;
		color: var(--lb-ink);
		font-weight: 700;
		text-decoration: underline;
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
	}
</style>
