<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import { GRAIN_ABSORPTION_L_PER_KG } from '$lib/brewing/simulate';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const grainKg = $derived(brew.context?.gravity.grist.grainKg ?? 0);
	const mashWaterL = $derived(grainKg * brew.recipe.mash.thicknessLPerKg);
	const absorbedL = $derived(grainKg * GRAIN_ABSORPTION_L_PER_KG);
	const spargeL = $derived(Math.max(0, brew.recipe.preBoilVolumeL - (mashWaterL - absorbedL)));
	const preBoilGravity = $derived(brew.context?.gravity.preBoilGravity ?? 1);
	const efficiency = $derived(brew.context?.gravity.effectiveEfficiency ?? 0);
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Into the fermenter"
			bind:value={brew.recipe.batchVolumeL}
			defaultValue={DEFAULTS.batchVolumeL}
			min={1}
			max={60}
			step={0.5}
			unit=" L"
			format={(n) => n.toFixed(1)}
			why="Everything the report shows — gravity, bitterness, colour — is concentration, so this number changes all of them at once."
		/>
		<SliderField
			label="Into the kettle"
			bind:value={brew.recipe.preBoilVolumeL}
			defaultValue={DEFAULTS.preBoilVolumeL}
			min={1}
			max={80}
			step={0.5}
			unit=" L"
			format={(n) => n.toFixed(1)}
			why="The difference between the two is what boils away. A vigorous open boil loses roughly 10% an hour."
		/>
	</div>

	<section class="rounded-lg bg-surface p-4 ring-1 ring-line">
		<h3 class="field-label mb-3">Where the water goes</h3>
		<div class="flex h-8 overflow-hidden rounded-md ring-1 ring-line-strong" aria-hidden="true">
			{#if brew.recipe.preBoilVolumeL > 0}
				{@const total = brew.recipe.preBoilVolumeL + absorbedL}
				<div
					class="flex items-center justify-center bg-copper-dim text-xs font-medium text-fg"
					style="width:{(brew.recipe.batchVolumeL / total) * 100}%"
				>
					beer
				</div>
				<div
					class="flex items-center justify-center bg-ui-active text-xs text-muted"
					style="width:{((brew.recipe.preBoilVolumeL - brew.recipe.batchVolumeL) / total) * 100}%"
				>
					boil-off
				</div>
				<div
					class="flex items-center justify-center bg-ui text-xs text-muted"
					style="width:{(absorbedL / total) * 100}%"
				>
					grain
				</div>
			{/if}
		</div>
		<dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div>
				<dt class="text-xs text-subtle">Mash water</dt>
				<dd class="tnum text-sm font-medium">{mashWaterL.toFixed(1)} L</dd>
			</div>
			<div>
				<dt class="text-xs text-subtle">Sparge water</dt>
				<dd class="tnum text-sm font-medium">{spargeL.toFixed(1)} L</dd>
			</div>
			<div>
				<dt class="text-xs text-subtle">Held by the grain</dt>
				<dd class="tnum text-sm font-medium">{absorbedL.toFixed(1)} L</dd>
			</div>
			<div>
				<dt class="text-xs text-subtle">Boiled away</dt>
				<dd class="tnum text-sm font-medium">
					{(brew.recipe.preBoilVolumeL - brew.recipe.batchVolumeL).toFixed(1)} L
				</dd>
			</div>
		</dl>
	</section>

	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Brewhouse efficiency"
			bind:value={brew.recipe.efficiencyPct}
			defaultValue={DEFAULTS.efficiencyPct}
			min={40}
			max={92}
			step={1}
			unit="%"
			marks={[
				{ at: 65, label: '65' },
				{ at: 75, label: '75' },
				{ at: 85, label: '85' }
			]}
			why="How much of the sugar in the grain actually reaches the fermenter. Most homebrew systems land between 65 and 78%. The simulator adjusts this further for mash length, grain bill size and how much base malt there is."
			deepDiveTitle="More about efficiency"
			deepDive="Efficiency is not a fixed property of your equipment. It falls as the grain bill grows, because a bigger bed holds more sugar-rich wort and the sparge dilutes what is left. It falls when the mash is cut short, because starch never converted. It falls when the grist is short of enzyme-carrying malt. Measure yours once at a normal gravity and treat that number as a starting point, not a constant."
		/>
		{#if Math.round(efficiency * 100) !== brew.recipe.efficiencyPct}
			<p class="prose-measure self-end text-xs text-muted">
				<span class="tnum text-fg"
					>{brew.recipe.efficiencyPct}% on your system → {Math.round(efficiency * 100)}%</span
				>
				once this recipe is taken into account.
				{#each brew.context?.gravity.efficiencyNotes ?? [] as note (note)}
					{note}
				{/each}
			</p>
		{/if}
	</div>

	<p class="tnum text-sm text-muted">
		Pre-boil gravity <span class="font-medium text-fg">{preBoilGravity.toFixed(3)}</span>, rising to
		<span class="font-medium text-fg">{brew.result.metrics.og.toFixed(3)}</span> by the end of the boil.
	</p>
</div>
