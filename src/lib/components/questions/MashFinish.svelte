<script lang="ts">
	/**
	 * How do you want it to finish?
	 *
	 * Four answers named for what the beer tastes like, plus a fifth card for
	 * placing rests by hand. The enzyme map lives behind that card.
	 */
	import SliderField from '../SliderField.svelte';
	import { step } from '$lib/brewing/recipes';
	import { strikeTempC } from '$lib/brewing/calculations';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import type { MashStepKind } from '$lib/brewing/types';

	const KIND_LABEL: Record<MashStepKind, string> = {
		acid: 'Acid / ferulic rest',
		protein: 'Protein rest',
		beta: 'Beta-amylase rest',
		alpha: 'Alpha-amylase rest',
		mashout: 'Mash-out (stops the enzymes)'
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

	/**
	 * One question with four answers, named for what the beer tastes like rather
	 * than for the enzyme doing the work. "Step mash: beta then alpha, more
	 * fermentable than either alone" told a reader with no brewing behind them
	 * absolutely nothing, which is the test every card here has to pass.
	 */
	const PRESETS = [
		{
			id: 'dry',
			name: 'Crisp and dry',
			note: 'A long, cool rest lets the yeast eat nearly all the sugar. Thinner, drier, a little more alcohol. What a lager or a light, refreshing beer wants.',
			steps: () => [step('beta', 63, 75), step('mashout', 76, 10)]
		},
		{
			id: 'single',
			name: 'Balanced',
			note: 'The safe middle, and what most homebrewers do. Works for almost any beer, and it is where to start if you are not sure.',
			steps: () => [step('alpha', 66, 60), step('mashout', 76, 10)]
		},
		{
			id: 'full',
			name: 'Full and sweet',
			note: 'A hotter rest leaves sugars behind that the yeast cannot touch. Rounder and sweeter, with a little less alcohol. Good under a stout or a mild.',
			steps: () => [step('alpha', 70, 60), step('mashout', 76, 10)]
		},
		{
			id: 'step',
			name: 'Two temperatures',
			note: 'Start cool for dryness, then finish hot to round it back out. More work than the others, and more control than either end alone.',
			steps: () => [step('beta', 63, 30), step('alpha', 71, 30), step('mashout', 76, 10)]
		}
	];

	/** True once the rests no longer match any card — you have gone your own way. */
	const matchesPreset = $derived(
		PRESETS.some((preset) => {
			const want = preset.steps();
			const have = brew.recipe.mash.steps;
			return (
				want.length === have.length &&
				want.every((w, i) => w.tempC === have[i].tempC && w.minutes === have[i].minutes)
			);
		})
	);
	let byHand = $state(false);
	const custom = $derived(byHand || !matchesPreset);

	/** Still on what a brand-new brew starts with, so the card can say so. */
	const untouched = $derived(
		brew.recipe.mash.steps.length === DEFAULTS.mash.steps.length &&
			brew.recipe.mash.steps.every(
				(s, i) =>
					s.tempC === DEFAULTS.mash.steps[i].tempC && s.minutes === DEFAULTS.mash.steps[i].minutes
			)
	);

	function choose(preset: (typeof PRESETS)[number]) {
		brew.recipe.mash.steps = preset.steps();
		// A new aim is a new mash-in; where the last one landed no longer applies.
		forgetLanding();
		byHand = false;
	}

	function forgetLanding() {
		if (brew.recipe.mash.toppedUpL !== undefined && grainKg > 0) {
			brew.recipe.mash.thicknessLPerKg -= brew.recipe.mash.toppedUpL / grainKg;
		}
		brew.recipe.mash.landedTempC = undefined;
		brew.recipe.mash.toppedUpL = undefined;
	}

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

	/** Percentage of the fermentable-plus-dextrin extract, for the bar. */
	const b = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0);
</script>

<div class="flex flex-col gap-5">
	<section>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each PRESETS as preset (preset.id)}
				{@const selected =
					!custom &&
					brew.recipe.mash.steps.length === preset.steps().length &&
					brew.recipe.mash.steps[0].tempC === preset.steps()[0].tempC}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={selected}
						onclick={() => choose(preset)}
					>
						<span class="block text-sm font-medium">
							{preset.name}
							{#if selected && preset.id === 'single' && untouched}
								<span class="ms-1.5 text-[0.625rem] tracking-wide text-fg/70 uppercase"
									>default</span
								>
							{/if}
						</span>
						<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
							>{preset.note}</span
						>
					</button>
				</li>
			{/each}
			<li>
				<!--
					The expert route is a card among the others, the way "treat it
					myself" is on the water stage. Everything below it — the enzyme map,
					the named rests, the sliders — is for the one reader in a hundred who
					wants to place a rest by hand, and it was drowning the other
					ninety-nine.
				-->
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {custom
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={custom}
					onclick={() => (byHand = true)}
				>
					<span class="block text-sm font-medium">Set the rests myself</span>
					<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
						Place each rest by hand on the enzyme map, and set how thick the mash is.
					</span>
				</button>
			</li>
		</ul>
	</section>

	{#if custom}
		<section>
			<h3 class="field-label mb-1">Where your rest sits</h3>
			<p class="prose-measure mb-2 text-xs text-muted">
				Two enzymes in the malt compete, and temperature picks the winner. The cooler one,
				beta-amylase, makes simple sugar the yeast can eat, so the beer finishes dry. The hotter
				one, alpha-amylase, makes longer sugars the yeast cannot touch, so the beer finishes full
				and sweet. Your rest sits somewhere between them.
			</p>

			<div class="relative h-24 rounded-lg bg-surface ring-1 ring-line">
				<div class="absolute inset-x-0 top-3 h-8" aria-hidden="true">
					<div
						class="absolute inset-y-0 rounded-s-md bg-hop-dim/70"
						style="left:{position(55)}%; width:{position(72) - position(55)}%"
					></div>
					<div
						class="absolute inset-y-0 rounded-e-md bg-copper-dim/70"
						style="left:{position(60)}%; width:{position(78) -
							position(60)}%; mix-blend-mode:screen"
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

			<!-- The map draws these rests and these rests move the map. One section. -->
			<div class="mt-4 flex items-center justify-between gap-3">
				<p class="field-label">Your rests</p>
				<button type="button" class="btn btn-ghost h-8 text-xs" onclick={addStep}>Add a rest</button
				>
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
									marks={[
										{ at: 63, label: 'dry' },
										{ at: 67, label: 'balanced' },
										{ at: 71, label: 'full' }
									]}
									why="The one decision this stage exists for. Around 63 °C the yeast can eat almost all the sugar, so the beer finishes thin and crisp. Around 71 °C much of it is left behind, so the beer finishes full and sweet. Below 58 or above 74 barely anything converts at all."
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
									marks={[
										{ at: 45, label: '45' },
										{ at: 60, label: 'usual' },
										{ at: 90, label: '90' }
									]}
									why="An hour is standard because that is roughly how long the malt takes to give up its sugar. Cut it much below 45 minutes and you leave sugar in the grain, which shows up later as a weaker beer. Past 90 there is nothing left to gain."
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
				defaultValue={DEFAULTS.mash.thicknessLPerKg}
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
					That is {mashWaterL.toFixed(1)} litres of water on {grainKg.toFixed(2)} kg of grain{#if strike !== undefined},
						going in at {strike.toFixed(0)} °C{/if}.
				</p>
			{/if}
		</div>
	{/if}

	{#if mash}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">What this mash does</h3>
			<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div>
					<dt class="text-xs text-subtle">Held at</dt>
					<dd class="tnum text-sm font-medium">{mash.effectiveTempC} °C</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Starch converted</dt>
					<dd class="tnum text-sm font-medium">
						{Math.round(mash.kinetics.conversion * 100)}%
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">The yeast can eat</dt>
					<dd class="tnum text-sm font-medium">
						{Math.round(mash.kinetics.attenuationLimit * 100)}% of it
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Body</dt>
					<dd class="text-sm font-medium">
						{mash.bodyFactor > 1.05 ? 'Boosted' : mash.bodyFactor < 0.95 ? 'Reduced' : 'Neutral'}
					</dd>
				</div>
			</dl>

			<!--
				The sugars the schedule actually made. This is not a lookup: the model
				integrates both amylases minute by minute, so an unusual schedule
				gets a real answer rather than the nearest published case.
			-->
			{#if mash.kinetics.conversion > 0.2}
				{@const k = mash.kinetics.spectrum}
				{@const total = k.glucose + k.maltose + k.maltotriose + k.dextrins}
				<div class="mt-3">
					<p class="field-label mb-1.5">What the sugar ended up as</p>
					<div class="flex h-5 overflow-hidden rounded-md ring-1 ring-line" aria-hidden="true">
						{#each [{ v: k.glucose, c: 'var(--color-hop)', fg: 'var(--color-ink)', l: 'glucose' }, { v: k.maltose, c: 'var(--color-amber)', fg: 'var(--color-ink)', l: 'maltose' }, { v: k.maltotriose, c: 'var(--color-copper)', fg: 'var(--color-ink)', l: 'maltotriose' }, { v: k.dextrins, c: 'var(--color-ui-active)', fg: 'var(--color-fg)', l: 'dextrins' }] as band (band.l)}
							{#if total > 0 && b(band.v, total) > 1.5}
								<div
									class="flex items-center justify-center gap-1 overflow-hidden text-[0.625rem] whitespace-nowrap"
									style="width:{b(band.v, total)}%; background:{band.c}; color:{band.fg}"
								>
									{Math.round(b(band.v, total))}%{b(band.v, total) > 14 ? ` ${band.l}` : ''}
								</div>
							{/if}
						{/each}
					</div>
					<p class="prose-measure mt-1.5 text-xs text-muted">
						The first three the yeast can eat; the dextrins it cannot, and they go into the glass as
						body.
					</p>
				</div>
			{/if}
			{#if mash.notes.length}
				<ul class="mt-2 flex flex-col gap-1">
					{#each mash.notes as note (note)}
						<li class="prose-measure text-xs text-muted">{note}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
