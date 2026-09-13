<script lang="ts">
	/**
	 * When do you stop collecting?
	 *
	 * The pre-boil volume, and everything that follows from it: where the water
	 * ends up, how much sugar comes with it, and what the kettle reads.
	 */
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
	const boilOffL = $derived(brew.recipe.preBoilVolumeL - brew.recipe.batchVolumeL);
	/** Collecting less than the batch size cannot work: the boil only removes volume. */
	const shortfall = $derived(boilOffL <= 0);
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Stop collecting at"
			bind:value={brew.recipe.preBoilVolumeL}
			defaultValue={DEFAULTS.preBoilVolumeL}
			min={1}
			max={80}
			step={0.5}
			unit=" L"
			format={(n) => n.toFixed(1)}
			why="This is the decision you actually make standing at the tun: keep rinsing and draining until the kettle holds this much, then stop. Collect more than your batch size, because the boil evaporates roughly 10% an hour."
		/>
	</div>

	{#if shortfall}
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
			You are stopping at {brew.recipe.preBoilVolumeL.toFixed(1)} L but want {brew.recipe.batchVolumeL.toFixed(
				1
			)} L of beer. The boil only takes volume away, so collect more than your batch size.
		</p>
	{/if}

	<section class="rounded-lg bg-surface p-4 ring-1 ring-line">
		<h3 class="field-label mb-3">Where the water goes</h3>
		{#if grainKg === 0}
			<p class="prose-measure text-sm text-muted">
				Nothing is mashed yet, so there is nothing to run off. Add a malt on the grain stage and
				this fills in.
			</p>
		{:else}
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
					<dd class="tnum text-sm font-medium">{Math.max(0, boilOffL).toFixed(1)} L</dd>
				</div>
			</dl>
		{/if}
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
		{#if grainKg > 0 && Math.round(efficiency * 100) !== brew.recipe.efficiencyPct}
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

	<!-- What you can actually read here. The gravity after the boil is measured
	     off a hydrometer in the chilled wort, two stages from now. -->
	<p class="prose-measure text-sm text-muted">
		A sample off the tap reads
		<span class="tnum font-medium text-fg">{preBoilGravity.toFixed(3)}</span>. The boil will
		concentrate it further as water evaporates.
	</p>
</div>
