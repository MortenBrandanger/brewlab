<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import AgeCurve from '../AgeCurve.svelte';
	import { brew } from '$lib/state/brew.svelte';

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
			label="Storage temperature"
			bind:value={brew.recipe.conditioning.tempC}
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
		deepDive="Beer already holds dissolved CO₂ when fermentation finishes, and how much depends on the temperature it finished at — warmer beer holds less. Priming sugar makes up the difference, at roughly 2 grams of dextrose per litre for every extra volume. Overshoot and you get gushers, or bottles that fail: standard crown-capped bottles are not rated much beyond three volumes."
	/>

	<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
		<h3 class="field-label mb-2">Priming</h3>
		<p class="tnum text-sm">
			About <span class="font-medium">{primingG.toFixed(0)} g</span> of dextrose for
			{brew.recipe.batchVolumeL.toFixed(1)} L, to reach {conditioning.co2Volumes.toFixed(1)} volumes.
		</p>
		<p class="mt-1 text-xs text-subtle">
			The beer already holds roughly {residualCo2.toFixed(1)} volumes, left over from fermenting at {finalTempC}
			°C. Force carbonating instead? Then this is just the target.
		</p>
	</section>

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

	<LearningNote
		why="Two clocks run at once. One is maturation: alcohol softens, roast and caramel knit together, sulfur blows off. The other is decay: hop aroma fades and oxygen does its slow work. Which clock matters depends entirely on the beer."
		deepDive="An imperial stout at 10% is genuinely better after six months, because it has a lot to gain and very little volatile aroma to lose. An IPA is at its best within a few weeks of packaging and is noticeably duller after three months. A lager needs weeks at low temperature simply to become itself. The one thing that helps every beer is storing it cold: it slows every reaction on both clocks, and the ones you want are the ones you were going to wait for anyway."
	/>
</div>
