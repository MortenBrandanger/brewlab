<script lang="ts">
	/**
	 * How warm, and for how long?
	 *
	 * The pitch rate and the temperature schedule, with the graph they draw and
	 * what the two of them together are likely to do to the beer.
	 */
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import FermentationGraph from '../FermentationGraph.svelte';
	import Meter from '../Meter.svelte';
	import { YEASTS, getYeast } from '$lib/brewing/ingredients';
	import { DEFAULTS, fermStep } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';

	/** The graph and the temperature marks need a strain even before one is picked. */
	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId) ?? YEASTS[0]);
	const risks = $derived(brew.context?.risks);
	const attenuation = $derived(brew.context?.attenuation);

	function addStep() {
		const last = brew.recipe.fermentation.steps.at(-1);
		brew.recipe.fermentation.steps.push(
			fermStep('Rest', Math.min(yeast.tempMaxC, (last?.tempC ?? yeast.tempIdealC) + 3), 3)
		);
	}

	function removeStep(id: string) {
		brew.recipe.fermentation.steps = brew.recipe.fermentation.steps.filter((s) => s.id !== id);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
		<SegmentedControl
			label="Pitch rate"
			bind:value={brew.recipe.fermentation.pitchRate}
			defaultValue={DEFAULTS.fermentation.pitchRate}
			options={[
				{ value: 'under', label: 'Light', hint: 'One tired packet into a big wort' },
				{ value: 'standard', label: 'Standard', hint: 'A healthy pitch for the gravity' },
				{ value: 'over', label: 'Heavy', hint: 'A starter, or several packets' }
			]}
		/>
	</div>

	<FermentationGraph
		steps={brew.recipe.fermentation.steps}
		{yeast}
		pitchTempC={brew.recipe.chill.pitchTempC}
		coldCrash={brew.recipe.fermentation.coldCrash}
	/>

	<section>
		<div class="flex items-center justify-between gap-3">
			<h3 class="field-label">Schedule</h3>
			<button type="button" class="btn btn-ghost h-8 text-xs" onclick={addStep}>Add a rest</button>
		</div>
		<ul class="mt-2 flex flex-col gap-2">
			{#each brew.recipe.fermentation.steps as fstep, index (fstep.id)}
				<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
					<div class="flex flex-wrap items-end gap-x-4 gap-y-2">
						<div class="w-32">
							<label class="field-label mb-1" for="label-{fstep.id}">What to call it</label>
							<input id="label-{fstep.id}" class="input" bind:value={fstep.label} />
						</div>
						<div class="min-w-[10rem] flex-1">
							<SliderField
								label="Temperature"
								bind:value={fstep.tempC}
								min={0}
								max={40}
								step={1}
								unit=" °C"
								marks={[
									{ at: yeast.tempMinC, label: String(yeast.tempMinC) },
									{ at: yeast.tempMaxC, label: String(yeast.tempMaxC) }
								]}
								why="The most consequential number in the brew. Cool keeps the yeast quiet and the beer clean; warm brings out fruit and spice. Past the strain's range — the two marks, {yeast.tempMinC}–{yeast.tempMaxC} °C for {yeast.name} — it makes harsh alcohols that taste of solvent and never age out."
								id="ft-{fstep.id}"
							/>
						</div>
						<div class="min-w-[9rem] flex-1">
							<SliderField
								label="Days"
								bind:value={fstep.days}
								min={0}
								max={60}
								step={1}
								unit={fstep.days === 1 ? ' day' : ' days'}
								marks={[
									{ at: 14, label: 'most ales' },
									{ at: 28, label: 'lagers' }
								]}
								why="How long it sits at that temperature. Most ales are finished inside two weeks and lagers take three or four. Leaving it longer costs nothing; stopping early leaves sugar unfermented and a buttery taste the yeast had not finished clearing up."
								id="fd-{fstep.id}"
							/>
						</div>
						{#if brew.recipe.fermentation.steps.length > 1}
							<button
								type="button"
								class="btn btn-quiet mb-1 h-9 w-9 !px-0"
								onclick={() => removeStep(fstep.id)}
								aria-label="Remove stage {index + 1}"
							>
								<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
									<path
										d="M4 4 L12 12 M12 4 L4 12"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</section>

	{#if risks && attenuation}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">What the yeast is likely to do</h3>
			<p class="tnum mb-3 text-sm">
				Attenuating to <span class="font-medium">{Math.round(attenuation.apparent * 100)}%</span>,
				finishing at
				<span class="font-medium">{attenuation.fg.toFixed(3)}</span> and
				<span class="font-medium">{attenuation.abv.toFixed(1)}% ABV</span>.
			</p>
			<div class="flex flex-col gap-1.5">
				<Meter
					label="Hot alcohol"
					value={risks.fusel}
					accent={risks.fusel > 4 ? 'danger' : 'hop'}
					hint="A hot, solvent-like burn from fermenting too warm. It does not fade with age."
				/>
				<Meter
					label="Diacetyl"
					value={risks.diacetyl}
					accent={risks.diacetyl > 4 ? 'danger' : 'hop'}
					hint="A butterscotch taste and a slick film on the tongue. A flaw, not a feature: the yeast clears it up if you let it finish."
				/>
			</div>
			<ul class="mt-3 flex flex-col gap-1">
				{#each attenuation.factors as factor (factor.label)}
					<li class="flex items-baseline justify-between gap-4 text-xs">
						<span class="text-muted">{factor.label}</span>
						<span
							class="tnum {factor.factor > 1
								? 'text-hop'
								: factor.factor < 1
									? 'text-warn'
									: 'text-fg'}"
						>
							×{factor.factor.toFixed(3)}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
