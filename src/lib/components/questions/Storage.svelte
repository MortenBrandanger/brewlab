<script lang="ts">
	/**
	 * How long does it sit, and how cold?
	 *
	 * Time and temperature, and the curve the two of them put the beer on.
	 */
	import SliderField from '../SliderField.svelte';
	import AgeCurve from '../AgeCurve.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const conditioning = $derived(brew.recipe.conditioning);

	/**
	 * Optional on older saved recipes, so it is read with a fallback. Bottles
	 * carbonate somewhere warm first, so for them this is where it goes after.
	 */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');

	const hopAroma = $derived(brew.result.sensory.hopAroma);
	const hoppy = $derived(
		(brew.context?.hopLoad.dryHopGPerL ?? 0) + (brew.context?.hopLoad.whirlpoolGPerL ?? 0) > 2
	);
</script>

<div class="flex flex-col gap-6">
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
