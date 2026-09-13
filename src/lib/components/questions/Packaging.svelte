<script lang="ts">
	/**
	 * Bottles or a keg?
	 *
	 * The choice, and — for bottles only — where the crate sits while it
	 * carbonates, because that is part of the same decision.
	 */
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	/** Optional on older saved recipes, so both are read with a fallback. */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');
	const carbonationTempC = $derived(brew.recipe.conditioning.carbonationTempC ?? 20);
	/**
	 * Bottle yeast is dormant in the cold. Sending bottles straight to a cellar
	 * means the priming sugar never ferments and the beer stays flat, which the
	 * stage used to allow silently while still printing a sugar dose.
	 */
	const tooColdToCarbonate = $derived(packaging === 'bottles' && carbonationTempC < 15);
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
</div>
