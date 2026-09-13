<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import { getYeast } from '$lib/brewing/ingredients';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId));
	const risks = $derived(brew.context?.risks);

	const riskRows = $derived(
		risks
			? [
					{
						label: 'Contamination',
						value: risks.infection,
						note: 'Wild yeast and bacteria get their head start in warm wort.'
					},
					{
						label: 'Cooked corn (DMS)',
						value: risks.dms,
						note: 'Pilsner malt keeps producing it until the wort is cold.'
					},
					{
						label: 'Oxidation',
						value: risks.oxidation,
						note: 'After fermentation, oxygen turns hop aroma into cardboard.'
					}
				]
			: []
	);
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Time to pitching temperature"
			bind:value={brew.recipe.chill.minutes}
			defaultValue={DEFAULTS.chill.minutes}
			min={5}
			max={240}
			step={5}
			unit=" min"
			marks={[
				{ at: 20, label: 'fast' },
				{ at: 120, label: 'slow' }
			]}
			why="Between about 60 °C and pitching temperature the wort is warm, sugary and unprotected. Every extra minute in that window is a minute something else could take hold."
		/>
		<SliderField
			label="Pitching temperature"
			bind:value={brew.recipe.chill.pitchTempC}
			defaultValue={DEFAULTS.chill.pitchTempC}
			min={2}
			max={40}
			step={1}
			unit=" °C"
			marks={yeast
				? [
						{ at: yeast.tempMinC, label: `${yeast.tempMinC}` },
						{ at: yeast.tempMaxC, label: `${yeast.tempMaxC}` }
					]
				: []}
			why={yeast
				? `${yeast.name} works between ${yeast.tempMinC} and ${yeast.tempMaxC} °C. Pitch at or below your target: the first twelve hours set the ester and fusel profile for the whole batch.`
				: 'Pitch at or below your target fermentation temperature.'}
		/>
	</div>

	<SegmentedControl
		label="Transfer to the fermenter"
		bind:value={brew.recipe.chill.transferQuality}
		defaultValue={DEFAULTS.chill.transferQuality}
		options={[
			{ value: 'careless', label: 'Splashed', hint: 'Poured from height, lid off, no care taken' },
			{ value: 'normal', label: 'Ordinary care', hint: 'Siphoned gently, sanitised equipment' },
			{ value: 'closed', label: 'Closed transfer', hint: 'Purged receiving vessel, no air contact' }
		]}
	/>

	<section>
		<h3 class="field-label mb-2">Cold-side risk</h3>
		<ul class="flex flex-col gap-2">
			{#each riskRows as row (row.label)}
				<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
					<div class="flex items-center justify-between gap-3">
						<span class="text-sm font-medium">{row.label}</span>
						<span
							class="chip"
							class:text-hop={row.value < 3}
							class:text-warn={row.value >= 3 && row.value < 6}
							class:text-danger-text={row.value >= 6}
						>
							{row.value < 3 ? 'low' : row.value < 6 ? 'moderate' : 'high'}
						</span>
					</div>
					<div class="mt-2 h-1.5 rounded-full bg-ui-active" aria-hidden="true">
						<div
							class="h-full rounded-full transition-[width] duration-200"
							style="width:{Math.min(100, row.value * 10)}%; background:{row.value < 3
								? 'var(--color-hop)'
								: row.value < 6
									? 'var(--color-warn)'
									: 'var(--color-danger)'}"
						></div>
					</div>
					<p class="mt-1.5 text-xs text-muted">{row.note}</p>
				</li>
			{/each}
		</ul>
	</section>
</div>
