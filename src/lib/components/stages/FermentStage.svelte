<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import LearningNote from '../LearningNote.svelte';
	import FermentationGraph from '../FermentationGraph.svelte';
	import Meter from '../Meter.svelte';
	import { YEASTS, getYeast } from '$lib/brewing/ingredients';
	import { fermStep } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';

	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId) ?? YEASTS[0]);
	const risks = $derived(brew.context?.risks);
	const attenuation = $derived(brew.context?.attenuation);

	const byKind = $derived([
		{ kind: 'ale' as const, label: 'Ale', yeasts: YEASTS.filter((y) => y.kind === 'ale') },
		{ kind: 'lager' as const, label: 'Lager', yeasts: YEASTS.filter((y) => y.kind === 'lager') },
		{
			kind: 'wild' as const,
			label: 'Wild and mixed',
			yeasts: YEASTS.filter((y) => y.kind === 'wild')
		}
	]);

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
	<section>
		<h3 class="field-label mb-2">Yeast</h3>
		<div class="flex flex-col gap-3">
			{#each byKind as group (group.kind)}
				<div>
					<p class="mb-1.5 text-xs text-subtle">{group.label}</p>
					<div class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
						{#each group.yeasts as option (option.id)}
							{@const selected = option.id === brew.recipe.fermentation.yeastId}
							<button
								type="button"
								class="rounded-lg p-2.5 text-start ring-1 transition-colors
									{selected
									? 'bg-copper-dim ring-copper'
									: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
								aria-pressed={selected}
								onclick={() => (brew.recipe.fermentation.yeastId = option.id)}
							>
								<span class="flex items-baseline justify-between gap-2">
									<span class="text-sm font-medium">{option.name}</span>
									<span class="tnum text-xs text-muted"
										>{Math.round(option.attenuation * 100)}%</span
									>
								</span>
								<span class="mt-0.5 block text-xs text-subtle">{option.blurb}</span>
								<span class="tnum mt-1 block text-[0.625rem] text-subtle">
									{option.tempMinC}–{option.tempMaxC} °C · {option.flocculation} flocculation
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<LearningNote why={yeast.note} />
	</section>

	<div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
		<SegmentedControl
			label="Pitch rate"
			bind:value={brew.recipe.fermentation.pitchRate}
			options={[
				{ value: 'under', label: 'Light', hint: 'One tired packet into a big wort' },
				{ value: 'standard', label: 'Standard', hint: 'A healthy pitch for the gravity' },
				{ value: 'over', label: 'Heavy', hint: 'A starter, or several packets' }
			]}
		/>
		<label class="flex items-start gap-3 self-end rounded-lg bg-surface p-3 ring-1 ring-line">
			<input
				type="checkbox"
				class="mt-0.5 h-5 w-5 rounded-sm border-line-strong bg-surface text-copper focus-visible:outline-2 focus-visible:outline-amber"
				bind:checked={brew.recipe.fermentation.coldCrash}
			/>
			<span>
				<span class="block text-sm font-medium">Cold crash before packaging</span>
				<span class="block text-xs text-subtle"
					>Drops yeast and haze out. Do it too early and diacetyl stays behind.</span
				>
			</span>
		</label>
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
							<label class="field-label mb-1" for="label-{fstep.id}">Stage</label>
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
					hint="Fusel alcohols from warm fermentation"
				/>
				<Meter
					label="Diacetyl"
					value={risks.diacetyl}
					accent={risks.diacetyl > 4 ? 'danger' : 'hop'}
					hint="Butter or butterscotch left behind"
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

	<LearningNote
		why="Yeast decides more of a beer's character than most recipes admit. Strain, temperature and pitch rate together set esters, phenols, how far the beer attenuates and whether it tastes hot."
		deepDive="Esters are fruity — banana, pear, apple — and they climb with temperature, gravity and underpitching, because they are made during the growth phase. Phenols are spicy and clove-like, and only some strains make them at all. Fusel alcohols are the failure mode: warm fermentation on a strong wort produces higher alcohols that taste solvent and do not age out. The usual defence is to pitch plenty of healthy yeast at the cool end of the range and let the temperature rise a few degrees once fermentation is established, which keeps the growth phase cool and the finish warm enough to clean up."
	/>
</div>
