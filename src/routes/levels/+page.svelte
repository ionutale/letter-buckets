<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { localizeHref } from '#lib/paraglide/runtime.js';
</script>

<main class="lb-safe placeholder">
	<h1>{m.levels()}</h1>
	<p>The chapter map arrives in Task 10.</p>
	<a href={localizeHref('/')}>{m.back()}</a>
</main>

<style>
	.placeholder {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: var(--lb-space-4);
		min-height: 100dvh;
		text-align: center;
	}
	a {
		color: var(--lb-ochre-dark);
		font-weight: 700;
	}
</style>
