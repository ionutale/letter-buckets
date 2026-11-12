<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<main class="home">
	<div class="hero" aria-hidden="true">
		<span class="tile">L</span>
		<span class="bucket"></span>
	</div>
	<h1>{m.app_name()}</h1>
	<p class="tagline">{m.tagline()}</p>
	<a class="play" href="/levels">{m.play()}</a>
</main>

<style>
	.home {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--lb-space-4);
		padding: var(--lb-space-6) var(--lb-space-5);
		text-align: center;
	}
	.hero {
		position: relative;
		width: 140px;
		height: 150px;
	}
	.tile {
		position: absolute;
		top: 0;
		left: 50%;
		width: 84px;
		height: 84px;
		transform: translateX(-50%) rotate(-4deg);
		display: grid;
		place-items: center;
		border-radius: var(--lb-radius);
		background: var(--lb-paper-2);
		box-shadow:
			0 6px 0 var(--lb-border),
			var(--lb-shadow-1);
		font-family: var(--lb-font-display);
		font-size: 3rem;
		font-weight: 800;
		color: var(--lb-ink);
	}
	.bucket {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 118px;
		height: 84px;
		transform: translateX(-50%);
		border-radius: 14px 14px 26px 26px;
		background: var(--lb-leaf);
		box-shadow: inset 0 8px 0 rgba(255, 255, 255, 0.18), var(--lb-shadow-2);
	}
	h1 {
		font-size: var(--lb-text-xl);
		line-height: 1;
	}
	.tagline {
		max-width: 22ch;
		margin: 0;
		color: var(--lb-ink-soft);
		font-size: var(--lb-text-md);
	}
	.play {
		display: inline-grid;
		place-items: center;
		min-width: 200px;
		min-height: 56px;
		padding: 0 var(--lb-space-6);
		border-radius: var(--lb-radius-pill);
		background: var(--lb-ochre);
		box-shadow: 0 5px 0 var(--lb-ochre-dark);
		color: #fff;
		font-family: var(--lb-font-display);
		font-size: var(--lb-text-lg);
		font-weight: 800;
		text-decoration: none;
	}
	.play:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--lb-ochre-dark);
	}
</style>
