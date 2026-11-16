<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PackageId } from '#lib/content/schema.js';

	interface Props {
		active: number;
		stamps?: number[];
		packageId?: PackageId;
		onselect: (chapter: number) => void;
	}

	let { active, stamps = [], packageId = 'p1', onselect }: Props = $props();

	const chapters = $derived(
		packageId === 'p2'
			? [
					{ n: 1, label: m.chapter_n({ n: 1 }), icon: 'home' },
					{ n: 2, label: m.chapter_n({ n: 2 }), icon: 'farm' },
					{ n: 3, label: m.chapter_n({ n: 3 }), icon: 'town' },
					{ n: 4, label: m.chapter_n({ n: 4 }), icon: 'nature' },
					{ n: 5, label: m.chapter_n({ n: 5 }), icon: 'world' }
				]
			: [
					{ n: 1, label: m.chapter_home(), icon: 'home' },
					{ n: 2, label: m.chapter_farm(), icon: 'farm' },
					{ n: 3, label: m.chapter_town(), icon: 'town' },
					{ n: 4, label: m.chapter_nature(), icon: 'nature' },
					{ n: 5, label: m.chapter_world(), icon: 'world' }
				]
	);
</script>

<nav class="tabs" aria-label={m.chapters()}>
	{#each chapters as chapter}
		<button
			type="button"
			class="tab"
			class:active={active === chapter.n}
			aria-pressed={active === chapter.n}
			onclick={() => onselect(chapter.n)}
		>
			<span class="emblem" data-icon={chapter.icon} aria-hidden="true">
				{#if chapter.icon === 'home'}
					<svg viewBox="0 0 32 32"><path d="M5 15 16 6l11 9v11H5z" /><path d="M12 26v-7h8v7" /></svg
					>
				{:else if chapter.icon === 'farm'}
					<svg viewBox="0 0 32 32"
						><path d="M5 26V12l11-6 11 6v14z" /><path d="M11 26v-8h10v8" /></svg
					>
				{:else if chapter.icon === 'town'}
					<svg viewBox="0 0 32 32"
						><path d="M5 26V12h9v14" /><path d="M14 26V8h13v18" /><path
							d="M18 12h5M18 16h5M18 20h5"
						/></svg
					>
				{:else if chapter.icon === 'nature'}
					<svg viewBox="0 0 32 32"
						><path d="M9 22a6 6 0 1 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1-1 10z" /><path
							d="M12 26h12"
						/></svg
					>
				{:else}
					<svg viewBox="0 0 32 32"
						><circle cx="16" cy="16" r="11" /><path
							d="M5 16h22M16 5c4 3 6 7 6 11s-2 8-6 11c-4-3-6-7-6-11s2-8 6-11z"
						/></svg
					>
				{/if}
			</span>
			<span class="label">{chapter.label}</span>
			{#if stamps.includes(chapter.n)}
				<span class="stamp" aria-hidden="true">★</span>
			{/if}
		</button>
	{/each}
</nav>

<style>
	.tabs {
		display: flex;
		gap: var(--lb-space-2);
		overflow-x: auto;
		padding-bottom: var(--lb-space-2);
		scrollbar-width: none;
	}
	.tabs::-webkit-scrollbar {
		display: none;
	}
	.tab {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 4px;
		min-width: 96px;
		min-height: 76px;
		padding: var(--lb-space-2);
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 700;
		text-align: center;
	}
	.tab.active {
		background: var(--lb-paper);
		color: var(--lb-ink);
		box-shadow:
			inset 0 0 0 2px var(--lb-ochre),
			var(--lb-shadow-1);
	}
	.emblem svg {
		width: 30px;
		height: 30px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.label {
		max-width: 88px;
		line-height: 1.15;
	}
	.stamp {
		position: absolute;
		top: 4px;
		right: 6px;
		color: var(--lb-gold);
		font-size: 1rem;
	}
</style>
