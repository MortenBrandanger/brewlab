<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import AgeCurve from '../AgeCurve.svelte';
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

	/** Optional on older saved recipes, so both are read with a fallback. */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');
	const carbonationTempC = $derived(brew.recipe.conditioning.carbonationTempC ?? 20);
	/**
	 * Bottle yeast is dormant in the cold. Sending bottles straight to a cellar
	 * means the priming sugar never ferments and the beer stays flat, which the
	 * stage used to allow silently while still printing a sugar dose.
	 */
	const tooColdToCarbonate = $derived(packaging === 'bottles' && carbonationTempC < 15);

	const hopAroma = $derived(brew.result.sensory.hopAroma);
	const hoppy = $derived(
		(brew.context?.hopLoad.dryHopGPerL ?? 0) + (brew.context?.hopLoad.whirlpoolGPerL ?? 0) > 2
	);
</script>

<div class="flex flex-col gap-6">
	<!-- The first decision of the stage: it changes what the rest of it asks. -->
	<SegmentedControl
		label="How are you packaging it"
		bind:value={() => packaging, (v) => (brew.recipe.conditioning.packaging = v)}
		options={[
			{
				value: 'bottles' as const,
				label: 'Bottles',
				hint: 'Filled with a measured dose of sugar and capped. The yeast still in the beer eats that sugar and the gas has nowhere to go, so the bottle carbonates itself over about two weeks in the warm.'
			},
			{
				value: 'keg' as const,
				label: 'Keg',
				hint: 'Sealed and connected to a CO₂ bottle, which pushes gas in until the beer holds what you asked for. No sugar, no waiting, and it can go straight into the cold.'
			}
		]}
	/>

	{#if packaging === 'bottles'}
		<SliderField
			label="Carbonating at"
			bind:value={() => carbonationTempC, (v) => (brew.recipe.conditioning.carbonationTempC = v)}
			defaultValue={DEFAULTS.conditioning.carbonationTempC}
			min={2}
			max={28}
			step={1}
			unit=" °C"
			marks={[
				{ at: 15, label: 'too cold' },
				{ at: 21, label: 'room' }
			]}
			why="Where the crate sits for the first fortnight, before it goes anywhere cold. The yeast left in the bottle has to be awake to eat the priming sugar, and below about 15 °C it is not."
		/>
		{#if tooColdToCarbonate}
			<p class="flex items-start gap-1.5 text-sm text-warn">
				<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
					<path
						d="M8 2 L15 14 L1 14 Z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linejoin="round"
					/>
					<path
						d="M8 6.5 V9.5 M8 11.5 V11.6"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
				At {carbonationTempC} °C the yeast in the bottle stays dormant, so the priming sugar is never
				eaten and the beer stays flat. Give it a fortnight somewhere around 20 °C first, then move the
				crate somewhere cold.
			</p>
		{/if}
	{/if}

	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Conditioning time"
			bind:value={brew.recipe.conditioning.days}
			defaultValue={DEFAULTS.conditioning.days}
			min={0}
			max={365}
			step={1}
			unit=" days"
			marks={[
				{ at: 14, label: '2 wk' },
				{ at: 90, label: '3 mo' },
				{ at: 180, label: '6 mo' }
			]}
			why="Strong, dark and lager-fermented beers gain here. Hop-forward beers only lose: aroma compounds are volatile and unstable, and nothing brings them back."
		/>
		<SliderField
			label={packaging === 'bottles' ? 'Then stored at' : 'Stored at'}
			bind:value={brew.recipe.conditioning.tempC}
			defaultValue={DEFAULTS.conditioning.tempC}
			min={-1}
			max={25}
			step={1}
			unit=" °C"
			marks={[
				{ at: 3, label: 'lagering' },
				{ at: 18, label: 'cellar' }
			]}
			why="Cold storage roughly doubles how long hop aroma survives and slows oxidation. Warm storage speeds up both maturation and every way a beer can go wrong."
		/>
	</div>

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

	<section>
		<h3 class="field-label mb-2">How this beer ages</h3>
		<AgeCurve curve={brew.result.ageCurve} />
		{#if hoppy && conditioning.days > 45}
			<p class="mt-2 flex items-start gap-1.5 text-xs text-warn">
				<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
					<path
						d="M8 2 L15 14 L1 14 Z"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linejoin="round"
					/>
					<path
						d="M8 6.5 V9.5 M8 11.5 V11.6"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
				Hop aroma is down to {hopAroma.toFixed(1)} out of 10 by the time this is poured. Ageing does not
				improve a hoppy beer.
			</p>
		{/if}
	</section>
</div>
