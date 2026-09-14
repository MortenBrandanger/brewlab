<script lang="ts">
	/**
	 * How warm?
	 *
	 * The most consequential number in the brew, asked as a choice rather than
	 * a slider: cool, the middle, or warm, each placed inside the strain you
	 * actually picked, with what it does to this beer on the card. The pitching
	 * temperature follows from it — you chill to just below where you mean to
	 * hold it — so it is written rather than asked.
	 *
	 * Placing rests by hand, and schedules with more than one rest, live behind
	 * the last card, the way the enzyme map does on the mash stage.
	 */
	import SliderField from '../SliderField.svelte';
	import FermentationGraph from '../FermentationGraph.svelte';
	import { YEASTS, getYeast } from '$lib/brewing/ingredients';
	import { fermStep } from '$lib/brewing/recipes';
	import { buildContext, simulate } from '$lib/brewing/simulate';
	import { FAULT_THRESHOLD } from '$lib/brewing/faults';
	import { brew } from '$lib/state/brew.svelte';

	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId) ?? YEASTS[0]);
	const steps = $derived(brew.recipe.fermentation.steps);

	/** Cool, the middle and warm, inside the strain's own range. */
	const CARDS = $derived([
		{
			id: 'cool',
			tempC: Math.min(yeast.tempIdealC, yeast.tempMinC + 1),
			name: 'Cool',
			what: `The bottom of ${yeast.name}'s range. Slow and clean — the least fruit and the least risk of a hot, solvent edge. Needs somewhere genuinely cool to stand.`
		},
		{
			id: 'middle',
			tempC: yeast.tempIdealC,
			name: 'In the middle',
			what: `Where the strain is happiest. Enough warmth to work at a normal pace and show its character, with room either side for the room to drift.`
		},
		{
			id: 'warm',
			tempC: Math.max(yeast.tempIdealC, yeast.tempMaxC - 1),
			name: 'Warm',
			what: `The top of the range. More fruit and spice, faster, and one warm afternoon from the line where the alcohols turn harsh.`
		}
	]);

	let byHand = $state(false);
	const custom = $derived(
		byHand || steps.length !== 1 || !CARDS.some((c) => c.tempC === steps[0]?.tempC)
	);

	function choose(tempC: number) {
		const days = steps[0]?.days ?? 14;
		brew.recipe.fermentation.steps = [fermStep('Primary', tempC, days)];
		// You chill to just below where you mean to hold it.
		brew.recipe.chill.pitchTempC = tempC - 1;
		byHand = false;
	}

	function addRest() {
		const last = steps.at(-1);
		brew.recipe.fermentation.steps.push(
			fermStep('Rest', Math.min(yeast.tempMaxC, (last?.tempC ?? yeast.tempIdealC) + 3), 3)
		);
	}

	function removeRest(id: string) {
		brew.recipe.fermentation.steps = steps.filter((s) => s.id !== id);
	}

	/** What each temperature would do to this beer, so the cards can be compared. */
	const perCard = $derived.by(() => {
		const out: Record<string, { fruit: string; heat: string }> = {};
		for (const card of CARDS) {
			const recipe = {
				...brew.recipe,
				chill: { ...brew.recipe.chill, pitchTempC: card.tempC - 1 },
				fermentation: {
					...brew.recipe.fermentation,
					steps: [fermStep('Primary', card.tempC, steps[0]?.days ?? 14)]
				}
			};
			const ctx = buildContext(recipe);
			const s = simulate(recipe).sensory;
			const fusel = ctx?.risks.fusel ?? 0;
			out[card.id] = {
				fruit: s.fruitEsters >= 5 ? yeast.esterNotes[1] : yeast.esterNotes[0],
				heat:
					fusel > FAULT_THRESHOLD.fusel
						? 'hot alcohol likely'
						: fusel > 2
							? 'a little warmth'
							: 'no heat'
			};
		}
		return out;
	});

	const risks = $derived(brew.context?.risks);

	/**
	 * A narrow-range strain lands the same at all three cards. Showing three
	 * identical consequences without comment looked like a bug; it is a fact
	 * about the strain, and worth a sentence.
	 */
	const allAlike = $derived.by(() => {
		const v = Object.values(perCard);
		return (
			v.length === CARDS.length && v.every((e) => e.fruit === v[0].fruit && e.heat === v[0].heat)
		);
	});
</script>

<div class="flex flex-col gap-5">
	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
		{#each CARDS as card (card.id)}
			{@const selected = !custom && steps[0]?.tempC === card.tempC}
			{@const effect = perCard[card.id]}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => choose(card.tempC)}
				>
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium">{card.name}</span>
						<span class="tnum text-xs {selected ? 'text-fg' : 'text-muted'}">{card.tempC} °C</span>
					</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
						>{card.what}</span
					>
					{#if effect}
						<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
							{effect.fruit.charAt(0).toUpperCase() + effect.fruit.slice(1)} · {effect.heat}
						</span>
					{/if}
				</button>
			</li>
		{/each}
		<li>
			<button
				type="button"
				class="h-full w-full rounded-lg p-3 text-start ring-1 {custom
					? 'bg-copper-dim ring-copper'
					: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
				aria-pressed={custom}
				onclick={() => (byHand = true)}
			>
				<span class="block text-sm font-medium">Set it myself</span>
				<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
					Any temperature, or a schedule with more than one rest — start cool, finish warm.
				</span>
			</button>
		</li>
	</ul>

	{#if custom}
		<section>
			<div class="flex items-center justify-between gap-3">
				<h3 class="field-label">Your schedule</h3>
				<button type="button" class="btn btn-ghost h-8 text-xs" onclick={addRest}>Add a rest</button
				>
			</div>
			<ul class="mt-2 flex flex-col gap-2">
				{#each steps as fstep, index (fstep.id)}
					<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
						<div class="flex flex-wrap items-end gap-x-4 gap-y-2">
							<div class="min-w-[10rem] flex-1">
								<SliderField
									label={index === 0 ? 'Temperature' : `Then, rest ${index + 1}`}
									bind:value={fstep.tempC}
									min={0}
									max={40}
									step={1}
									unit=" °C"
									marks={[
										{ at: yeast.tempMinC, label: String(yeast.tempMinC) },
										{ at: yeast.tempMaxC, label: String(yeast.tempMaxC) }
									]}
									id="ft-{fstep.id}"
								/>
							</div>
							<div class="min-w-[9rem] flex-1">
								<SliderField
									label="For"
									bind:value={fstep.days}
									min={0}
									max={60}
									step={1}
									unit={fstep.days === 1 ? ' day' : ' days'}
									id="fd-{fstep.id}"
								/>
							</div>
							{#if steps.length > 1}
								<button
									type="button"
									class="btn btn-quiet mb-1 h-9 w-9 !px-0"
									onclick={() => removeRest(fstep.id)}
									aria-label="Remove rest {index + 1}"
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
	{/if}

	{#if allAlike}
		<p class="prose-measure text-xs text-subtle">
			{yeast.name} lands the same at all three. Its range is narrow and it is a well-behaved strain; inside
			the green band the choice barely shows in the glass. Outside it is another matter.
		</p>
	{/if}

	<FermentationGraph
		{steps}
		{yeast}
		pitchTempC={brew.recipe.chill.pitchTempC}
		coldCrash={brew.recipe.fermentation.coldCrash}
	/>

	<p class="prose-measure text-sm text-muted">
		You chill the wort to
		<span class="tnum font-medium text-fg">{brew.recipe.chill.pitchTempC} °C</span> and pitch, then
		hold it at
		<span class="tnum font-medium text-fg">{steps[0]?.tempC ?? yeast.tempIdealC} °C</span>.
		{#if risks && risks.fusel > FAULT_THRESHOLD.fusel}
			<span class="text-warn-bright">
				At this temperature {yeast.name} makes hot, solvent-like alcohols that never age out.
			</span>
		{/if}
	</p>
</div>
