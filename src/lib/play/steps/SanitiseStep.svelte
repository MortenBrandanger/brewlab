<script lang="ts">
	/**
	 * Spray everything the cold beer will touch.
	 *
	 * Five pieces of kit and a bottle of no-rinse sanitiser. Each one counts
	 * once the mist has properly covered it, and glistens afterwards so you can
	 * see what is left. The engine has no half-sanitised bench: anything missed
	 * has only been rinsed, and the cold side is judged as rinsed.
	 */
	import { day } from '../day.svelte';
	import { KIT, SanitiseScene } from '../coldSanitise';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import type { PointerInput } from '../kit';

	const bench = new SanitiseScene();
	let covered = $state(KIT.map(() => 0));
	let aiming = $state<number | undefined>(undefined);

	function tick(dt: number, input: PointerInput, calm: boolean) {
		bench.update(dt, input, calm);
		if (
			bench.coverage.some((c, i) => Math.abs(c - covered[i]) > 0.04 || (c >= 1 && covered[i] < 1))
		) {
			covered = [...bench.coverage];
		}
		if (aiming !== bench.auto) aiming = bench.auto;
	}

	const done = $derived(covered.filter((c) => c >= 1).length);
	const missed = $derived(KIT.filter((_, i) => covered[i] < 1).map((k) => k.name));
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal) => bench.draw(ctx, pal, pal.amber)}
			pan={day.step.pan}
			cursor="crosshair"
			label="The cold-side kit laid out on the bench: the fermenting bucket, its lid, an airlock, a siphon with its hose, and a long spoon. A spray bottle of sanitiser follows your pointer; press on a piece of kit to spray it."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			{#each KIT as item, i (item.id)}
				<button
					type="button"
					class="btn btn-ghost min-h-12 px-4"
					disabled={covered[i] >= 1 || aiming !== undefined}
					onclick={() => (bench.auto = i)}
				>
					{covered[i] >= 1
						? `${item.name[0].toUpperCase()}${item.name.slice(1)} sprayed`
						: `Spray the ${item.name}`}
				</button>
			{/each}
		</div>
	{/snippet}
	{#snippet readout()}
		{done} of {KIT.length} sprayed.
		{#if missed.length === 0}
			Everything the cold wort will touch is sanitised.
		{:else if done > 0}
			Still dry: {missed.join(', ')}. Anything you skip has only been rinsed, and germs on it can
			still get into the beer.
		{:else}
			Press on a piece of kit to spray it.
		{/if}
	{/snippet}
	{#snippet card()}
		<p class="text-muted">No-rinse sanitiser on everything that touches the cold wort.</p>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {done === KIT.length ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			onclick={() => day.finish({ sanitised: { done, total: KIT.length } })}
		>
			{done === KIT.length ? 'All clean, start chilling' : 'Good enough, start chilling'}
		</button>
	{/snippet}
</StepFrame>
