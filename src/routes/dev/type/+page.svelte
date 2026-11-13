<script lang="ts">
	import LetterTile from '#lib/components/LetterTile.svelte';

	const rows = [
		{ name: 'Latin', letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
		{ name: 'Romanian', letters: 'ĂÂÎȘȚ' },
		{ name: 'German', letters: 'ÄÖÜ' },
		{ name: 'Cyrillic', letters: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' }
	];
	const sizes = [44, 56, 72];
</script>

<svelte:head>
	<title>Type check — Letter Buckets</title>
</svelte:head>

<main class="type-page lb-safe">
	<h1>Type check</h1>
	<p>Every playable glyph, at every tile size.</p>
	{#each sizes as size}
		<section>
			<h2>{size}px</h2>
			{#each rows as row}
				<div class="row" style={`--tile-size:${size}px`}>
					<span class="name">{row.name}</span>
					<div class="letters">
						{#each [...row.letters] as letter}
							<LetterTile {letter} state="revealed" />
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{/each}
</main>

<style>
	.type-page {
		max-width: 1100px;
		margin: 0 auto;
	}
	h1 {
		font-size: var(--lb-text-xl);
	}
	p {
		color: var(--lb-ink-soft);
	}
	section {
		margin-block: var(--lb-space-6);
	}
	h2 {
		font-size: var(--lb-text-md);
		color: var(--lb-ink-soft);
	}
	.row {
		display: grid;
		grid-template-columns: 90px 1fr;
		align-items: start;
		gap: var(--lb-space-3);
		margin-block: var(--lb-space-3);
	}
	.name {
		padding-top: var(--lb-space-2);
		font-size: var(--lb-text-sm);
		font-weight: 700;
		color: var(--lb-ink-soft);
	}
	.letters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lb-space-1);
	}
</style>
