<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { downloads } from '#lib/pwa/downloads.svelte.js';

	const percent = $derived(
		downloads.progress.total > 0
			? Math.min(100, Math.round((downloads.progress.done / downloads.progress.total) * 100))
			: 0
	);

	const label = $derived(
		downloads.progress.pkg === 'p2'
			? m.downloading_package({ n: 2 })
			: downloads.progress.pkg === 'p3'
				? m.downloading_package({ n: 3 })
				: m.preparing_game()
	);
</script>

{#if downloads.progress.active}
	<div
		class="download-bar"
		role="progressbar"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={percent}
		aria-label={label}
	>
		<div class="line"><span style={`width:${percent}%`}></span></div>
		<p class="label">
			{label}
			<span class="percent">{percent}%</span>
		</p>
	</div>
{/if}

<style>
	.download-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 60;
		pointer-events: none;
	}
	.line {
		height: 4px;
		background: color-mix(in srgb, var(--lb-ochre) 22%, transparent);
	}
	.line span {
		display: block;
		height: 100%;
		background: var(--lb-ochre);
		transition: width 240ms ease;
	}
	.label {
		position: absolute;
		top: 8px;
		right: 10px;
		margin: 0;
		padding: 4px 10px;
		border-radius: var(--lb-radius-pill);
		background: var(--lb-paper);
		box-shadow: var(--lb-shadow-1);
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-xs);
		font-weight: 700;
	}
	.percent {
		margin-left: 6px;
		color: var(--lb-ink);
		font-variant-numeric: tabular-nums;
	}
	@media (prefers-reduced-motion: reduce) {
		.line span {
			transition: none;
		}
	}
</style>
