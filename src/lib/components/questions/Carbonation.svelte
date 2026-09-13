<script lang="ts">
	/**
	 * How fizzy should it be?
	 *
	 * The target in volumes, and what reaching it takes: a dose of sugar in
	 * bottles, or a regulator setting on a keg.
	 */
	import SliderField from '../SliderField.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const conditioning = $derived(brew.recipe.conditioning);

	/**
	 * Priming sugar.
	 *
	 * Beer already holds residual CO₂ that depends on the temperature fermentation
	 * finished at — the standard relationship, with temperature in Fahrenheit:
	 *   volumes = 3.0378 − 0.050062·T + 0.00026555·T²
	 * Dextrose yields about 0.49 g of CO₂ per gram, and one volume is 1.96 g/L, so
	 * each extra volume costs roughly 4 g of dextrose per litre.
	 */
	const finalTempC = $derived(brew.recipe.fermentation.steps.at(-1)?.tempC ?? 20);
	const residualCo2 = $derived.by(() => {
		const f = finalTempC * 1.8 + 32;
		return Math.max(0, 3.0378 - 0.050062 * f + 0.00026555 * f * f);
	});
	const primingG = $derived(
		Math.max(0, (conditioning.co2Volumes - residualCo2) * 4 * brew.recipe.batchVolumeL)
	);

	/** Optional on older saved recipes, so it is read with a fallback. */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');
</script>

<div class="flex flex-col gap-6">
	<SliderField
		label="Carbonation"
		bind:value={brew.recipe.conditioning.co2Volumes}
		defaultValue={DEFAULTS.conditioning.co2Volumes}
		min={0.8}
		max={4}
		step={0.1}
		unit=" volumes"
		format={(n) => n.toFixed(1)}
		marks={[
			{ at: 1.4, label: 'cask' },
			{ at: 2.4, label: 'most beer' },
			{ at: 3.2, label: 'saison' }
		]}
		why="A volume of CO₂ means the beer holds its own volume again in dissolved gas. Carbonation is a flavour control, not a formality: it carries aroma out of the glass, sharpens bitterness and makes a beer feel lighter than its gravity suggests."
		deepDiveTitle="More about carbonation"
		deepDive="Beer already holds dissolved CO₂ when fermentation finishes, and how much depends on the temperature it finished at — warmer beer holds less. Priming sugar makes up the difference, at roughly 2 grams of dextrose per litre for every extra volume. Overshoot and you get gushers, or bottles that fail: standard crown-capped bottles are not rated much beyond three volumes."
	/>

	{#if packaging === 'bottles'}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">Sugar to add before capping</h3>
			<p class="tnum text-sm">
				About <span class="font-medium">{primingG.toFixed(0)} g</span> of dextrose for
				{brew.recipe.batchVolumeL.toFixed(1)} L, to reach {conditioning.co2Volumes.toFixed(1)} volumes.
			</p>
			<p class="prose-measure mt-1 text-xs text-subtle">
				Dextrose is plain glucose, sold as brewing sugar. Boil it in a cup of water, let it cool,
				and siphon the beer onto it so it mixes evenly — a bottle that gets more than its share is
				the one that gushes. The beer already holds roughly {residualCo2.toFixed(1)} volumes left over
				from fermenting at {finalTempC} °C, so only the difference needs adding.
			</p>
		</section>
	{:else}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">On the gas</h3>
			<p class="prose-measure text-sm text-muted">
				No sugar needed: the CO₂ bottle does the work. Set the regulator to whatever holds
				{conditioning.co2Volumes.toFixed(1)} volumes at your serving temperature and leave it a few days.
			</p>
		</section>
	{/if}
</div>
