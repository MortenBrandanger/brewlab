<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import { step } from '$lib/brewing/recipes';
	import { strikeTempC } from '$lib/brewing/calculations';
	import { brew } from '$lib/state/brew.svelte';
	import type { MashStepKind } from '$lib/brewing/types';

	const KIND_LABEL: Record<MashStepKind, string> = {
		acid: 'Acid / ferulic rest',
		protein: 'Protein rest',
		beta: 'Beta-amylase rest',
		alpha: 'Alpha-amylase rest',
		mashout: 'Mash-out'
	};

	const mash = $derived(brew.context?.mash);
	const grainKg = $derived(brew.context?.gravity.grist.grainKg ?? 0);
	const mashWaterL = $derived(grainKg * brew.recipe.mash.thicknessLPerKg);
	/** The first rest is the one you actually have to hit with hot water. */
	const firstRest = $derived(
		brew.recipe.mash.steps.find((step) => step.tempC >= 40 && step.tempC <= 78) ??
			brew.recipe.mash.steps[0]
	);
	const strike = $derived(
		firstRest ? strikeTempC(firstRest.tempC, brew.recipe.mash.thicknessLPerKg) : undefined
	);

	const PRESETS = [
		{
			id: 'single',
			name: 'Single infusion',
			note: 'One rest, one hour. What most homebrewers do, and it works.',
			steps: () => [step('alpha', 66, 60), step('mashout', 76, 10)]
		},
		{
			id: 'dry',
			name: 'Dry and fermentable',
			note: 'A long, cool rest. More alcohol, thinner body.',
			steps: () => [step('beta', 63, 75), step('mashout', 76, 10)]
		},
		{
			id: 'full',
			name: 'Full bodied',
			note: 'A hot rest leaves dextrins the yeast cannot touch.',
			steps: () => [step('alpha', 70, 60), step('mashout', 76, 10)]
		},
		{
			id: 'step',
			name: 'Step mash',
			note: 'Beta then alpha: more fermentable than either alone.',
			steps: () => [step('beta', 63, 30), step('alpha', 71, 30), step('mashout', 76, 10)]
		}
	];

	function addStep() {
		brew.recipe.mash.steps = [step('beta', 63, 20), ...brew.recipe.mash.steps];
	}

	function removeStep(id: string) {
		brew.recipe.mash.steps = brew.recipe.mash.steps.filter((s) => s.id !== id);
	}

	function kindFor(tempC: number): MashStepKind {
		if (tempC < 46) return 'acid';
		if (tempC < 58) return 'protein';
		if (tempC < 67) return 'beta';
		if (tempC < 75) return 'alpha';
		return 'mashout';
	}

	/** Where a step sits on the enzyme map, 40–80 °C. */
	const position = (tempC: number) => ((Math.min(80, Math.max(40, tempC)) - 40) / 40) * 100;
</script>

<div class="flex flex-col gap-6">
	<div>
		<h3 class="field-label mb-2">Start from</h3>
		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
			{#each PRESETS as preset (preset.id)}
				<button
					type="button"
					class="rounded-lg bg-surface p-3 text-start ring-1 ring-line transition-colors hover:bg-ui-hover hover:ring-line-strong"
					onclick={() => (brew.recipe.mash.steps = preset.steps())}
				>
					<span class="block text-sm font-medium">{preset.name}</span>
					<span class="mt-0.5 block text-xs text-subtle">{preset.note}</span>
				</button>
			{/each}
		</div>
	</div>

	<section>
		<h3 class="field-label mb-1">Enzyme map</h3>
		<p class="prose-measure mb-2 text-xs text-muted">
			Two enzymes in the malt compete, and temperature picks the winner. The cooler one,
			beta-amylase, makes simple sugar the yeast can eat, so the beer finishes dry. The hotter one,
			alpha-amylase, makes longer sugars the yeast cannot touch, so the beer finishes full and
			sweet. Your rest sits somewhere between them.
		</p>
		<div class="relative h-24 rounded-lg bg-surface ring-1 ring-line">
			<div class="absolute inset-x-0 top-3 h-8" aria-hidden="true">
				<div
					class="absolute inset-y-0 rounded-s-md bg-hop-dim/70"
					style="left:{position(55)}%; width:{position(72) - position(55)}%"
				></div>
				<div
					class="absolute inset-y-0 rounded-e-md bg-copper-dim/70"
					style="left:{position(60)}%; width:{position(78) - position(60)}%; mix-blend-mode:screen"
				></div>
			</div>
			<span class="absolute top-4 text-[0.625rem] text-fg" style="left:{position(58)}%"
				>beta-amylase</span
			>
			<span class="absolute top-7 text-[0.625rem] text-fg" style="left:{position(69)}%"
				>alpha-amylase</span
			>

			{#each brew.recipe.mash.steps as mashStep (mashStep.id)}
				<div
					class="absolute top-1 bottom-7 w-0.5 bg-amber"
					style="left:{position(mashStep.tempC)}%"
					aria-hidden="true"
				></div>
				<span
					class="tnum absolute bottom-7 -translate-x-1/2 rounded-sm bg-amber px-1 text-[0.625rem] font-bold text-ink"
					style="left:{position(mashStep.tempC)}%"
					aria-hidden="true"
				>
					{mashStep.tempC}°
				</span>
			{/each}

			<div
				class="absolute inset-x-0 bottom-1 flex justify-between px-2 text-[0.625rem] text-subtle"
				aria-hidden="true"
			>
				<span>40 °C</span><span>50</span><span>60</span><span>70</span><span>80 °C</span>
			</div>
		</div>
		<p class="sr-only">
			Mash steps: {brew.recipe.mash.steps
				.map((s) => `${s.tempC} degrees for ${s.minutes} minutes`)
				.join(', ')}.
		</p>
	</section>

	<section>
		<div class="flex items-center justify-between gap-3">
			<h3 class="field-label">Steps</h3>
			<button type="button" class="btn btn-ghost h-8 text-xs" onclick={addStep}>Add a rest</button>
		</div>
		<ul class="mt-2 flex flex-col gap-2">
			{#each brew.recipe.mash.steps as mashStep, index (mashStep.id)}
				<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
					<div class="flex flex-wrap items-end gap-x-4 gap-y-3">
						<span class="chip">{KIND_LABEL[kindFor(mashStep.tempC)]}</span>
						<div class="min-w-[11rem] flex-1">
							<SliderField
								label="Temperature"
								bind:value={mashStep.tempC}
								min={35}
								max={80}
								step={1}
								unit=" °C"
								id="mash-t-{mashStep.id}"
							/>
						</div>
						<div class="min-w-[9rem] flex-1">
							<SliderField
								label="Time"
								bind:value={mashStep.minutes}
								min={0}
								max={120}
								step={5}
								unit=" min"
								id="mash-m-{mashStep.id}"
							/>
						</div>
						<button
							type="button"
							class="btn btn-quiet mb-1 h-9 w-9 !px-0"
							onclick={() => removeStep(mashStep.id)}
							aria-label="Remove step {index + 1}"
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
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<div>
		<SliderField
			label="Mash thickness"
			bind:value={brew.recipe.mash.thicknessLPerKg}
			min={1.5}
			max={5}
			step={0.1}
			unit=" L/kg"
			format={(n) => n.toFixed(1)}
			marks={[
				{ at: 2.5, label: '2.5' },
				{ at: 3.5, label: '3.5' }
			]}
			why="How soupy the porridge is. Between 2.5 and 3.5 litres per kilogram is comfortable to stir. Thicker protects the enzymes from the heat; thinner converts a little more completely and slightly more fermentably."
		/>
		{#if grainKg > 0}
			<p class="tnum mt-1 text-xs text-muted">
				That is {mashWaterL.toFixed(1)} litres of water on {grainKg.toFixed(2)} kg of grain.
			</p>
		{/if}
	</div>

	{#if strike !== undefined && grainKg > 0 && firstRest}
		<section class="rounded-lg bg-surface p-4 ring-1 ring-line">
			<h3 class="field-label mb-2">Before the grain goes in</h3>
			<p class="prose-measure text-sm">
				Heat your water to
				<span class="tnum font-display text-lg font-semibold text-copper-text">
					{strike.toFixed(0)} °C
				</span>
				— not {firstRest.tempC} °C.
			</p>
			<p class="prose-measure mt-1.5 text-xs text-muted">
				Room-temperature grain is cold and there is a lot of it, so the moment you stir it in the
				temperature drops. At {brew.recipe.mash.thicknessLPerKg.toFixed(1)} L/kg it falls about
				{(strike - firstRest.tempC).toFixed(0)} degrees, which lands you on your {firstRest.tempC} °C
				rest. A thicker mash has less water to hold the heat, so it needs a bigger head start.
			</p>
		</section>
	{/if}

	{#if mash}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">What this mash does</h3>
			<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div>
					<dt class="text-xs text-subtle">Effective temperature</dt>
					<dd class="tnum text-sm font-medium">{mash.effectiveTempC} °C</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Conversion time</dt>
					<dd class="tnum text-sm font-medium">{mash.conversionMinutes} min</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Fermentability</dt>
					<dd class="text-sm font-medium">
						{mash.fermentabilityFactor > 1.03
							? 'Drier than usual'
							: mash.fermentabilityFactor < 0.97
								? 'Fuller than usual'
								: 'Middle of the road'}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Body</dt>
					<dd class="text-sm font-medium">
						{mash.bodyFactor > 1.05 ? 'Boosted' : mash.bodyFactor < 0.95 ? 'Reduced' : 'Neutral'}
					</dd>
				</div>
			</dl>
			{#if mash.notes.length}
				<ul class="mt-2 flex flex-col gap-1">
					{#each mash.notes as note (note)}
						<li class="prose-measure text-xs text-muted">{note}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<LearningNote
		why="Two enzymes compete. Beta-amylase makes simple, fermentable sugar and dies above about 70 °C. Alpha-amylase survives the heat but leaves long dextrins the yeast cannot use. Where you sit between them decides how dry the beer finishes."
		deepDive="At 62 °C beta-amylase dominates and the wort is highly fermentable, so the beer finishes low and tastes thin and crisp. At 70 °C beta is gone within minutes and alpha leaves unfermentable dextrins behind, so the beer finishes high and tastes full and sweet. A step mash gets both: a rest near 63 °C for fermentability, then one near 71 °C to finish the conversion. The mash-out at 76 °C stops enzyme activity entirely and thins the wort so it runs off the grain bed more freely."
	/>
</div>
